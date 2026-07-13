"""Campus events from the GobblerConnect (Campus Labs Engage) discovery API."""
from datetime import datetime, timedelta, timezone

import httpx
from bs4 import BeautifulSoup

from . import cache

SEARCH = "https://gobblerconnect.vt.edu/api/discovery/event/search"


class UpstreamError(Exception):
    pass


def _strip_html(html: str, limit: int = 300) -> str:
    text = BeautifulSoup(html or "", "lxml").get_text(" ", strip=True)
    return text[:limit] + ("..." if len(text) > limit else "")


def _to_float(v) -> float | None:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


async def upcoming(days: int = 14) -> list[dict]:
    key = f"events:{days}"
    cached = cache.get(key)
    if cached is not None:
        return cached
    now = datetime.now(timezone.utc)
    params = {
        "endsAfter": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "orderByField": "endsOn",
        "orderByDirection": "ascending",
        "status": "Approved",
        "take": "50",
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(SEARCH, params=params)
            r.raise_for_status()
            data = r.json()
    except (httpx.HTTPError, ValueError) as e:
        raise UpstreamError(f"gobblerconnect.vt.edu unavailable: {e}") from e

    cutoff = now + timedelta(days=days)
    out = []
    for e in data.get("value", []):
        starts = e.get("startsOn") or ""
        try:
            starts_dt = datetime.fromisoformat(starts)
        except ValueError:
            starts_dt = None
        if starts_dt and starts_dt > cutoff:
            continue
        out.append({
            "id": str(e.get("id", "")),
            "name": e.get("name") or "",
            "org": e.get("organizationName") or "",
            "starts": starts,
            "ends": e.get("endsOn") or "",
            "location": e.get("location") or "",
            "lat": _to_float(e.get("latitude")),
            "lng": _to_float(e.get("longitude")),
            "theme": e.get("theme") or "",
            "benefits": e.get("benefitNames") or [],
            "rsvp": int(e.get("rsvpTotal") or 0),
            "url": f"https://gobblerconnect.vt.edu/event/{e.get('id')}",
            "description": _strip_html(e.get("description") or ""),
        })
    return cache.put(key, out, 600)
