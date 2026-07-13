"""LLM assistant for /api/ask: tool-calling over live providers.

Uses any OpenAI-compatible endpoint (default z.ai GLM-4.7-Flash). Without
LLM_API_KEY, falls back to keyword routing so the endpoint still works.
"""
import json
import os
from datetime import datetime
from zoneinfo import ZoneInfo

from providers import bt, dining, events, maps

LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.z.ai/api/paas/v4")
LLM_MODEL = os.getenv("LLM_MODEL", "glm-4.7-flash")

_SOURCES = {
    "get_bus_status": "https://ridebt.org/",
    "plan_trip": "https://maps.google.com",
    "get_dining": "https://foodpro.students.vt.edu/menus/",
    "get_menu": "https://foodpro.students.vt.edu/menus/",
    "get_events": "https://gobblerconnect.vt.edu/",
}

TOOLS = [
    {"type": "function", "function": {
        "name": "get_bus_status",
        "description": "Blacksburg Transit routes currently operating, with live vehicle counts.",
        "parameters": {"type": "object", "properties": {}},
    }},
    {"type": "function", "function": {
        "name": "plan_trip",
        "description": "Plan a transit/walking trip between two places in Blacksburg/VT campus.",
        "parameters": {"type": "object", "properties": {
            "origin": {"type": "string"}, "destination": {"type": "string"}},
            "required": ["origin", "destination"]},
    }},
    {"type": "function", "function": {
        "name": "get_dining",
        "description": "VT dining halls: open/closed now and today's hours.",
        "parameters": {"type": "object", "properties": {}},
    }},
    {"type": "function", "function": {
        "name": "get_menu",
        "description": "Today's menu for a VT dining hall by (partial) name.",
        "parameters": {"type": "object", "properties": {
            "hall_name": {"type": "string"}}, "required": ["hall_name"]},
    }},
    {"type": "function", "function": {
        "name": "get_events",
        "description": "Upcoming VT club/campus events from GobblerConnect.",
        "parameters": {"type": "object", "properties": {
            "days": {"type": "integer", "minimum": 1, "maximum": 30}}},
    }},
]


async def _exec_tool(name: str, args: dict):
    if name == "get_bus_status":
        routes = await bt.routes()
        vehicles = await bt.vehicles()
        counts: dict[str, int] = {}
        for v in vehicles:
            counts[v["route"]] = counts.get(v["route"], 0) + 1
        return [{"route": r["short_name"], "name": r["name"],
                 "live_buses": counts.get(r["short_name"], 0)} for r in routes]
    if name == "plan_trip":
        return await maps.plan(args["origin"], args["destination"])
    if name == "get_dining":
        return await dining.halls()
    if name == "get_menu":
        target = args["hall_name"].lower()
        halls = await dining.halls()
        hall = next((h for h in halls if target in h["name"].lower()), halls[0] if halls else None)
        if not hall:
            return {"error": "no dining halls found"}
        m = await dining.menu(hall["location_num"])
        # trim for token budget: cap items per station
        for meal in m["meals"]:
            for st in meal["stations"]:
                if len(st["items"]) > 8:
                    st["items"] = st["items"][:8] + ["..."]
        return m
    if name == "get_events":
        evs = await events.upcoming(args.get("days", 7))
        return [{k: e[k] for k in ("name", "org", "starts", "location", "benefits", "url")}
                for e in evs[:15]]
    return {"error": f"unknown tool {name}"}


def _now_et() -> str:
    return datetime.now(ZoneInfo("America/New_York")).strftime("%A %B %d, %Y %I:%M %p ET")


async def _ask_llm(query: str) -> dict:
    from openai import AsyncOpenAI  # deferred: only needed when key set
    client = AsyncOpenAI(api_key=os.environ["LLM_API_KEY"], base_url=LLM_BASE_URL)
    messages = [
        {"role": "system", "content":
            "You are Campus Concierge, a Virginia Tech campus assistant. "
            f"Current time in Blacksburg: {_now_et()}. "
            "Use tools for any live data (buses, dining, events, trips). "
            "Answer concisely in plain text for students. Never invent data; "
            "if a tool errors or returns nothing, say so."},
        {"role": "user", "content": query},
    ]
    sources: list[str] = []
    for _ in range(4):
        resp = await client.chat.completions.create(
            model=LLM_MODEL, messages=messages, tools=TOOLS, temperature=0.3)
        msg = resp.choices[0].message
        if not msg.tool_calls:
            return {"answer": msg.content or "(no answer)", "sources": sources}
        messages.append({"role": "assistant", "content": msg.content,
                         "tool_calls": [tc.model_dump() for tc in msg.tool_calls]})
        for tc in msg.tool_calls:
            name = tc.function.name
            try:
                args = json.loads(tc.function.arguments or "{}")
                result = await _exec_tool(name, args)
                src = _SOURCES.get(name)
                if src and src not in sources:
                    sources.append(src)
            except Exception as e:
                result = {"error": str(e)}
            messages.append({"role": "tool", "tool_call_id": tc.id,
                             "content": json.dumps(result, default=str)})
    return {"answer": "Sorry, I couldn't finish answering that — try a simpler question.",
            "sources": sources}


async def _keyword_fallback(query: str) -> dict:
    q = query.lower()
    if any(w in q for w in ("bus", "transit", "ride", "route")):
        data = await _exec_tool("get_bus_status", {})
        running = [f"{d['route']} ({d['name']}): {d['live_buses']} live" for d in data]
        answer = ("Routes operating now:\n" + "\n".join(running)) if running \
            else "No BT routes operating right now."
        return {"answer": answer, "sources": ["https://ridebt.org/"]}
    if any(w in q for w in ("dining", "food", "eat", "menu", "meal")):
        halls = await dining.halls()
        lines = [f"{h['name']}: {'open' if h['is_open'] else 'closed' if h['is_open'] is False else 'hours unknown'}"
                 f"{' — ' + h['hours_today'] if h['hours_today'] else ''}" for h in halls]
        return {"answer": "Dining halls:\n" + "\n".join(lines),
                "sources": ["https://foodpro.students.vt.edu/menus/"]}
    if any(w in q for w in ("club", "event", "activity", "happening")):
        evs = await events.upcoming(7)
        lines = [f"{e['name']} — {e['org']} — {e['starts']} @ {e['location']}" for e in evs[:8]]
        return {"answer": ("Upcoming events:\n" + "\n".join(lines)) if lines
                else "No events found in the next 7 days.",
                "sources": ["https://gobblerconnect.vt.edu/"]}
    return {"answer": "I can help with buses, dining, and campus events. "
                      "The full assistant needs an LLM key (LLM_API_KEY) to answer free-form questions.",
            "sources": []}


async def ask(query: str) -> dict:
    if os.getenv("LLM_API_KEY"):
        return await _ask_llm(query)
    return await _keyword_fallback(query)
