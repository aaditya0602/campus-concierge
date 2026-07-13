"""Transit directions via the Google Maps Directions REST API (httpx, no SDK)."""
import os
import re

import httpx
from bs4 import BeautifulSoup

DIRECTIONS = "https://maps.googleapis.com/maps/api/directions/json"


class UpstreamError(Exception):
    pass


def _blacksburg(place: str) -> str:
    # Bare campus building names geocode poorly; bias to Blacksburg unless already qualified.
    if re.search(r"blacksburg|,\s*va|virginia", place, re.I):
        return place
    return f"{place}, Blacksburg, VA"


def _clean(html: str) -> str:
    return BeautifulSoup(html or "", "lxml").get_text(" ", strip=True)


async def plan(origin: str, destination: str) -> dict:
    key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not key:
        raise UpstreamError("Google Maps unavailable: GOOGLE_MAPS_API_KEY not set")
    params = {
        "origin": _blacksburg(origin),
        "destination": _blacksburg(destination),
        "mode": "transit",
        "departure_time": "now",
        "key": key,
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(DIRECTIONS, params=params)
            r.raise_for_status()
            data = r.json()
    except (httpx.HTTPError, ValueError) as e:
        raise UpstreamError(f"Google Maps unavailable: {e}") from e

    if data.get("status") != "OK" or not data.get("routes"):
        reason = data.get("error_message") or data.get("status") or "no routes"
        raise UpstreamError(f"Google Maps unavailable: {reason}")

    leg = data["routes"][0]["legs"][0]
    steps = []
    for s in leg.get("steps", []):
        step = {
            "mode": s.get("travel_mode", ""),
            "instruction": _clean(s.get("html_instructions", "")),
            "distance_text": (s.get("distance") or {}).get("text", ""),
            "duration_text": (s.get("duration") or {}).get("text", ""),
        }
        td = s.get("transit_details")
        if td:
            line = td.get("line") or {}
            step["transit"] = {
                "line": line.get("short_name") or line.get("name") or "",
                "departure_stop": (td.get("departure_stop") or {}).get("name", ""),
                "departure_time": (td.get("departure_time") or {}).get("text", ""),
                "arrival_stop": (td.get("arrival_stop") or {}).get("name", ""),
                "arrival_time": (td.get("arrival_time") or {}).get("text", ""),
                "num_stops": td.get("num_stops"),
            }
        steps.append(step)

    return {
        "duration_text": (leg.get("duration") or {}).get("text", ""),
        "steps": steps,
        "sources": ["https://maps.google.com", "https://ridebt.org/"],
    }
