"""Campus Concierge API: live Blacksburg Transit, VT dining, campus events, transit routing."""
import os

from dotenv import load_dotenv

load_dotenv()  # before providers read env

import uvicorn
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from providers import assistant, bt, dining, events, maps

app = FastAPI(title="Campus Concierge API", version="2.0.0")

# Extra origins (e.g. the deployed frontend) via ALLOWED_ORIGINS=comma,separated
_extra_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", *_extra_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- models (API contract) ---

class Route(BaseModel):
    short_name: str
    name: str
    color: str
    text_color: str
    realtime: bool


class RoutesOut(BaseModel):
    routes: list[Route]


class Vehicle(BaseModel):
    vehicle: str
    route: str
    pattern: str
    last_stop: str
    stop_code: str
    at_stop: bool
    lat: float
    lng: float
    heading: int
    updated: str


class VehiclesOut(BaseModel):
    vehicles: list[Vehicle]


class Stop(BaseModel):
    name: str
    code: str
    lat: float
    lng: float


class StopsOut(BaseModel):
    stops: list[Stop]


class Departure(BaseModel):
    route: str
    pattern: str
    stop: str
    time: str


class DeparturesOut(BaseModel):
    departures: list[Departure]


class AlertsOut(BaseModel):
    alerts: list[dict]


class PlanIn(BaseModel):
    origin: str
    destination: str


class TransitDetails(BaseModel):
    line: str
    departure_stop: str
    departure_time: str
    arrival_stop: str
    arrival_time: str
    num_stops: int | None = None


class PlanStep(BaseModel):
    mode: str
    instruction: str
    distance_text: str
    duration_text: str
    transit: TransitDetails | None = None


class PlanOut(BaseModel):
    duration_text: str
    steps: list[PlanStep]
    sources: list[str]


class Hall(BaseModel):
    name: str
    location_num: str
    is_open: bool | None
    hours_today: str | None
    menu_url: str


class HallsOut(BaseModel):
    halls: list[Hall]


class Station(BaseModel):
    name: str
    items: list[str]


class Meal(BaseModel):
    name: str
    stations: list[Station]


class MenuOut(BaseModel):
    hall: str
    date: str
    meals: list[Meal]


class Event(BaseModel):
    id: str
    name: str
    org: str
    starts: str
    ends: str
    location: str
    lat: float | None
    lng: float | None
    theme: str
    benefits: list[str]
    rsvp: int
    url: str
    description: str


class EventsOut(BaseModel):
    events: list[Event]


def _502(e: Exception):
    return HTTPException(status_code=502, detail=str(e))


# --- endpoints ---

@app.get("/")
async def root():
    return {"status": "ok", "service": "campus-concierge"}


@app.get("/api/bus/routes", response_model=RoutesOut)
async def bus_routes():
    try:
        return {"routes": await bt.routes()}
    except bt.UpstreamError as e:
        raise _502(e)


@app.get("/api/bus/vehicles", response_model=VehiclesOut)
async def bus_vehicles():
    try:
        return {"vehicles": await bt.vehicles()}
    except bt.UpstreamError as e:
        raise _502(e)


@app.get("/api/bus/stops/{route_short_name}", response_model=StopsOut)
async def bus_stops(route_short_name: str):
    try:
        return {"stops": await bt.stops(route_short_name)}
    except bt.UpstreamError as e:
        raise _502(e)


@app.get("/api/bus/departures", response_model=DeparturesOut)
async def bus_departures(
    stop_code: str, route: str = "", n: int = Query(default=3, ge=1, le=20)
):
    try:
        return {"departures": await bt.departures(stop_code, route, n)}
    except bt.UpstreamError as e:
        raise _502(e)


@app.get("/api/bus/alerts", response_model=AlertsOut)
async def bus_alerts():
    try:
        return {"alerts": await bt.alerts()}
    except bt.UpstreamError as e:
        raise _502(e)


@app.post("/api/bus/plan", response_model=PlanOut)
async def bus_plan(body: PlanIn):
    try:
        return await maps.plan(body.origin, body.destination)
    except maps.UpstreamError as e:
        raise _502(e)


@app.get("/api/dining", response_model=HallsOut)
async def dining_halls():
    try:
        return {"halls": await dining.halls()}
    except dining.UpstreamError as e:
        raise _502(e)


@app.get("/api/dining/{location_num}/menu", response_model=MenuOut)
async def dining_menu(location_num: str):
    try:
        return await dining.menu(location_num)
    except dining.UpstreamError as e:
        raise _502(e)


class AskIn(BaseModel):
    query: str


class AskOut(BaseModel):
    answer: str
    sources: list[str]
    speech: str | None = None  # voice-friendly rewrite of answer, when available


@app.post("/api/ask", response_model=AskOut)
async def ask(body: AskIn):
    try:
        return await assistant.ask(body.query)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"assistant error: {e}")


@app.get("/api/events", response_model=EventsOut)
async def campus_events(days: int = Query(default=14, ge=1, le=90)):
    try:
        return {"events": await events.upcoming(days)}
    except events.UpstreamError as e:
        raise _502(e)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
