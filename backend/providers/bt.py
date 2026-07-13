"""Blacksburg Transit via the BT4U classic web service (XML over form-encoded POST)."""
import xml.etree.ElementTree as ET
from datetime import datetime
from zoneinfo import ZoneInfo

import httpx

from . import cache

BASE = "https://www.bt4uclassic.org/webservices/bt4u_webservice.asmx"
ET_TZ = ZoneInfo("America/New_York")  # BT service dates/times are Blacksburg local


class UpstreamError(Exception):
    pass


async def _call(operation: str, data: dict | None = None) -> ET.Element:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(f"{BASE}/{operation}", data=data or {})
            r.raise_for_status()
        return ET.fromstring(r.content)
    except (httpx.HTTPError, ET.ParseError) as e:
        raise UpstreamError(f"BT4U unavailable: {e}") from e


def _rows(root: ET.Element, tag: str) -> list[dict]:
    return [{c.tag: (c.text or "").strip() for c in row} for row in root.iter(tag)]


def _today() -> str:
    return datetime.now(ET_TZ).strftime("%Y-%m-%d")


async def routes() -> list[dict]:
    cached = cache.get("bt:routes")
    if cached is not None:
        return cached
    root = await _call("GetCurrentRoutes")
    out = [
        {
            "short_name": r.get("RouteShortName", ""),
            "name": r.get("RouteName", ""),
            "color": r.get("RouteColor", ""),
            "text_color": r.get("RouteTextColor", ""),
            "realtime": r.get("RealTimeInfoAvail", "").lower() in ("y", "yes", "true", "1"),
        }
        for r in _rows(root, "CurrentRoutes")
    ]
    return cache.put("bt:routes", out, 3600)


def _to_float(s: str) -> float:
    try:
        return float(s)
    except ValueError:
        return 0.0


async def vehicles() -> list[dict]:
    cached = cache.get("bt:vehicles")
    if cached is not None:
        return cached
    root = await _call("GetCurrentBusInfo")
    out = [
        {
            "vehicle": r.get("AgencyVehicleName", ""),
            "route": r.get("RouteShortName", ""),
            "pattern": r.get("PatternName", ""),
            "last_stop": r.get("LastStopName", ""),
            "stop_code": r.get("StopCode", ""),
            "at_stop": r.get("IsBusAtStop", "").lower() in ("y", "yes", "true", "1"),
            "lat": _to_float(r.get("Latitude", "")),
            "lng": _to_float(r.get("Longitude", "")),
            "heading": int(_to_float(r.get("Direction", ""))),
            "updated": r.get("LatestEvent", ""),
        }
        for r in _rows(root, "LatestInfoTable")
    ]
    return cache.put("bt:vehicles", out, 10)


async def stops(route_short_name: str) -> list[dict]:
    key = f"bt:stops:{route_short_name}"
    cached = cache.get(key)
    if cached is not None:
        return cached
    root = await _call(
        "GetScheduledStopInfo",
        {"routeShortName": route_short_name, "serviceDate": _today()},
    )
    out = [
        {
            "name": r.get("StopName", ""),
            "code": r.get("StopCode", ""),
            "lat": _to_float(r.get("Latitude", "")),
            "lng": _to_float(r.get("Longitude", "")),
        }
        for r in _rows(root, "ScheduledStops")
    ]
    return cache.put(key, out, 3600)


async def departures(stop_code: str, route: str = "", n: int = 3) -> list[dict]:
    key = f"bt:dep:{stop_code}:{route}:{n}"
    cached = cache.get(key)
    if cached is not None:
        return cached
    root = await _call(
        "GetNextDeparturesForStop",
        {"stopCode": stop_code, "routeShortName": route, "noOfTrips": str(n)},
    )
    out = [
        {
            "route": r.get("RouteShortName", ""),
            "pattern": r.get("PatternName", ""),
            "stop": r.get("StopName", ""),
            "time": r.get("AdjustedDepartureTime", ""),
        }
        for r in _rows(root, "NextDepartures")
    ]
    return cache.put(key, out, 30)


async def alerts() -> list[dict]:
    cached = cache.get("bt:alerts")
    if cached is not None:
        return cached
    root = await _call(
        "GetActiveAlerts", {"alertTypes": "", "alertCauses": "", "alertEffects": ""}
    )
    rows = _rows(root, "ActiveAlerts")
    # Service reports "no alerts" as a row with an <Error> child; that's not an alert.
    out = []
    for r in rows:
        if "Error" in r and "no active alerts" in r["Error"].lower():
            continue
        r["message"] = r.get("AlertMessage") or r.get("Message") or r.get("Error") or ""
        out.append(r)
    return cache.put("bt:alerts", out, 60)
