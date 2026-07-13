"""VT dining: menus scraped from FoodPro, hours from the student-affairs hours API."""
import re
from datetime import datetime
from urllib.parse import parse_qs, urlparse
from zoneinfo import ZoneInfo

import httpx
from bs4 import BeautifulSoup

from . import cache

FOODPRO = "https://foodpro.students.vt.edu/menus/"
# JSON API behind https://apps.students.vt.edu/hours (linked from foodpro as "View Today's Hours")
HOURS_API = "https://apps.students.vt.edu/hours/Api/NonRestricted/UnitsOpenOnDay/Date/{date}"
ET_TZ = ZoneInfo("America/New_York")


class UpstreamError(Exception):
    pass


async def _get(url: str) -> httpx.Response:
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            r = await client.get(url)
            r.raise_for_status()
        return r
    except httpx.HTTPError as e:
        raise UpstreamError(f"{urlparse(url).hostname} unavailable: {e}") from e


async def _locations() -> list[dict]:
    """[{name, location_num, menu_url}] scraped from the FoodPro index page."""
    cached = cache.get("dining:locations")
    if cached is not None:
        return cached
    r = await _get(FOODPRO)
    soup = BeautifulSoup(r.text, "lxml")
    out, seen = [], set()
    for a in soup.select('a[href*="MenuAtLocation.aspx"]'):
        num = parse_qs(urlparse(a["href"]).query).get("locationNum", [None])[0]
        name = a.get_text(strip=True) or a.get("title", "")
        if not num or num in seen:
            continue
        seen.add(num)
        out.append({
            "name": name,
            "location_num": num,
            "menu_url": f"{FOODPRO}MenuAtLocation.aspx?locationNum={num}&naFlag=1",
        })
    if not out:
        raise UpstreamError("foodpro.students.vt.edu unavailable: no dining locations found on menu index")
    return cache.put("dining:locations", out, 3600)


async def _hours_by_location_num() -> dict[str, list[dict]]:
    """locationNum -> [{label, title, open_time, close_time}], matched via each unit's
    FoodPro menu URL in the hours API response. Units without a FoodPro link are skipped."""
    cached = cache.get("dining:hours")
    if cached is not None:
        return cached
    today = datetime.now(ET_TZ).strftime("%Y-%m-%d")
    r = await _get(HOURS_API.format(date=today))
    try:
        units = r.json()
    except ValueError as e:
        raise UpstreamError(f"apps.students.vt.edu unavailable: bad JSON: {e}") from e
    out: dict[str, list[dict]] = {}
    for unit in units:
        num = None
        for u in unit.get("urls") or []:
            m = re.search(r"locationNum=(\d+)", u.get("url") or "")
            if m:
                num = m.group(1)
                break
        if not num:
            continue
        out[num] = [
            {
                "label": h.get("label") or "",
                "title": h.get("title") or "",
                "open_time": h.get("open_time") or "",
                "close_time": h.get("close_time") or "",
            }
            for h in unit.get("hours") or []
        ]
    return cache.put("dining:hours", out, 3600)


def _hours_summary(periods: list[dict]) -> tuple[str | None, bool | None]:
    """(hours_today string, is_open) from actually-scraped periods; (None, None) if unknown."""
    if not periods:
        return None, None
    text = "; ".join(
        f"{p['label']}: {p['title']}" if p["label"] else p["title"] for p in periods
    )
    now = datetime.now(ET_TZ).strftime("%H:%M:%S")
    is_open = any(p["open_time"] <= now <= p["close_time"]
                  for p in periods if p["open_time"] and p["close_time"])
    return text, is_open


async def halls() -> list[dict]:
    locations = await _locations()
    try:
        hours_map = await _hours_by_location_num()
    except UpstreamError:
        hours_map = {}  # hours source down: report hours as unknown, never fabricate
    out = []
    for loc in locations:
        hours_today, is_open = _hours_summary(hours_map.get(loc["location_num"], []))
        out.append({**loc, "is_open": is_open, "hours_today": hours_today})
    return out


async def menu(location_num: str) -> dict:
    key = f"dining:menu:{location_num}"
    cached = cache.get(key)
    if cached is not None:
        return cached
    url = f"{FOODPRO}MenuAtLocation.aspx?locationNum={location_num}&naFlag=1"
    r = await _get(url)
    soup = BeautifulSoup(r.text, "lxml")

    name_el = soup.select_one("#dining_center_name_container h2")
    hall = name_el.get_text(strip=True) if name_el else ""
    date_el = soup.select_one("#menu_date_selection option[selected]")
    date = date_el.get_text(strip=True) if date_el else datetime.now(ET_TZ).strftime("%Y-%m-%d")

    meals = []
    for tab in soup.select("#full_menu_tabs a.nav-link"):
        pane_id = (tab.get("href") or "").lstrip("#")
        pane = soup.find(id=pane_id)
        if pane is None:
            continue
        stations = []
        for card in pane.select(".card"):
            header = card.select_one(".card-header a")
            items = [a.get_text(strip=True) for a in card.select(".recipe_title a")]
            items = [i for i in items if i]
            if items:
                stations.append({
                    "name": header.get_text(strip=True) if header else "",
                    "items": items,
                })
        meals.append({"name": tab.get_text(strip=True), "stations": stations})

    if not hall and not meals:
        raise UpstreamError(
            f"foodpro.students.vt.edu unavailable: no menu content for locationNum={location_num}"
        )
    return cache.put(key, {"hall": hall, "date": date, "meals": meals}, 3600)
