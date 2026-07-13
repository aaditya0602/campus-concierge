# Campus Concierge

Virginia Tech's scattered campus resources in one dashboard: live Blacksburg Transit buses, dining hall hours + menus, and club events — plus a voice-capable AI assistant.

## What it does

- **Bus** — routes operating right now, live vehicle counts, next departures per stop (real BT4U data), and A→B trip planning (Google Maps transit directions).
- **Dining** — halls with real open/closed status and today's hours (VT hours API), expandable live menus scraped from FoodPro.
- **Events** — upcoming club/campus events from GobblerConnect (Engage API), with "Free Food" tags and links to sign up.
- **Assistant** — chat + voice (Web Speech API). With an LLM key it answers free-form questions using live data via tool calling; without one it falls back to keyword routing.

All data is live. Nothing is mocked; when a source is down the API returns 502 and the UI shows an error state — the app never fabricates campus data.

## Architecture

```
frontend/  React 18 + TypeScript + Vite + Tailwind (dashboard UI, port 3000)
backend/   FastAPI (port 8000)
  providers/
    bt.py         Blacksburg Transit — BT4U web service (XML), TTL-cached
    dining.py     FoodPro menus + apps.students.vt.edu hours API
    events.py     GobblerConnect Engage discovery API
    maps.py       Google Directions (transit) via REST
    assistant.py  LLM tool-calling (OpenAI-compatible; default z.ai GLM-4.7-Flash)
    cache.py      stdlib TTL cache
```

## Setup

Prereqs: Python 3.11+, Node 18+.

### Backend

```bash
cd backend
python -m venv ../.venv
../.venv/Scripts/activate        # Windows
pip install -r requirements.txt
copy env.example .env            # then fill in keys (see below)
python main.py                   # http://localhost:8000 — docs at /docs
```

### Frontend

```bash
cd frontend
npm install
npm run dev                      # http://localhost:3000
```

### Keys (`backend/.env`)

| Var | Needed for | Where |
|---|---|---|
| `GOOGLE_MAPS_API_KEY` | Trip planning (`/api/bus/plan`) | Google Cloud Console (Directions + Geocoding) |
| `LLM_API_KEY` | Free-form assistant answers | https://z.ai (free tier) |
| `LLM_BASE_URL`, `LLM_MODEL` | Optional overrides | Any OpenAI-compatible endpoint (e.g. Gemini) |

Bus, dining, and events need **no keys**.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/bus/routes` | Routes operating now |
| GET | `/api/bus/vehicles` | Live bus positions |
| GET | `/api/bus/stops/{route}` | Stops for a route |
| GET | `/api/bus/departures?stop_code=&route=&n=` | Next departures |
| GET | `/api/bus/alerts` | Service alerts |
| POST | `/api/bus/plan` | `{origin, destination}` → transit/walking steps |
| GET | `/api/dining` | Halls, open status, today's hours |
| GET | `/api/dining/{location_num}/menu` | Today's menu (meals → stations → items) |
| GET | `/api/events?days=` | Upcoming GobblerConnect events |
| POST | `/api/ask` | `{query}` → assistant `{answer, sources}` |

## Notes

- All displayed times are Blacksburg time (America/New_York) regardless of viewer timezone.
- Voice input needs Chrome/Edge + mic permission.
- Off-hours (~11 PM–6 AM ET) the bus card truthfully shows no routes operating.

## License

MIT. Built for Virginia Tech students; not affiliated with Virginia Tech, Blacksburg Transit, or Google.
