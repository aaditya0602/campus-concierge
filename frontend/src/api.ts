// Typed fetch helpers for the Campus Concierge backend API.
const BASE_URL = 'http://localhost:8000'

export class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
  } catch {
    throw new ApiError('Cannot reach the backend. Is it running?')
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const body = (await res.json()) as { detail?: string }
      if (body?.detail) detail = body.detail
    } catch {
      // ignore non-JSON error bodies
    }
    throw new ApiError(detail)
  }
  return res.json() as Promise<T>
}

const get = <T>(path: string) => request<T>(path)
const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) })

// ---------- Bus ----------

export interface BusRoute {
  short_name: string
  name: string
  color: string
  text_color: string
  realtime: boolean
}

export interface BusVehicle {
  vehicle: string
  route: string
  pattern: string
  last_stop: string
  stop_code: string
  at_stop: boolean
  lat: number
  lng: number
  heading: number
  updated: string
}

export interface BusStop {
  name: string
  code: string
  lat: number
  lng: number
}

export interface BusDeparture {
  route: string
  pattern: string
  stop: string
  time: string
}

export interface PlanStep {
  mode: string
  instruction: string
  distance_text: string
  duration_text: string
  line?: string
  departure_stop?: string
  departure_time?: string
  arrival_stop?: string
  arrival_time?: string
  num_stops?: number
}

export interface PlanResponse {
  duration_text: string
  steps: PlanStep[]
  sources: string[]
}

export const busApi = {
  routes: () => get<{ routes: BusRoute[] }>('/api/bus/routes'),
  vehicles: () => get<{ vehicles: BusVehicle[] }>('/api/bus/vehicles'),
  stops: (routeShortName: string) =>
    get<{ stops: BusStop[] }>(`/api/bus/stops/${encodeURIComponent(routeShortName)}`),
  departures: (stopCode: string, route: string, n = 3) =>
    get<{ departures: BusDeparture[] }>(
      `/api/bus/departures?stop_code=${encodeURIComponent(stopCode)}&route=${encodeURIComponent(route)}&n=${n}`
    ),
  plan: (origin: string, destination: string) =>
    post<PlanResponse>('/api/bus/plan', { origin, destination }),
}

// ---------- Dining ----------

export interface DiningHall {
  name: string
  location_num: string
  is_open: boolean | null
  hours_today: string | null
  menu_url: string
}

export interface MenuStation {
  name: string
  items: string[]
}

export interface MenuMeal {
  name: string
  stations: MenuStation[]
}

export interface DiningMenu {
  hall: string
  date: string
  meals: MenuMeal[]
}

export const diningApi = {
  halls: () => get<{ halls: DiningHall[] }>('/api/dining'),
  menu: (locationNum: string) =>
    get<DiningMenu>(`/api/dining/${encodeURIComponent(locationNum)}/menu`),
}

// ---------- Events ----------

export interface CampusEvent {
  id: string
  name: string
  org: string
  starts: string
  ends: string
  location: string
  theme: string
  benefits: string[]
  rsvp: string
  url: string
  description: string
}

export const eventsApi = {
  list: (days = 14) => get<{ events: CampusEvent[] }>(`/api/events?days=${days}`),
}

// ---------- Assistant ----------

export interface AskResponse {
  answer: string
  sources: string[]
}

export const assistantApi = {
  ask: (query: string) => post<AskResponse>('/api/ask', { query }),
}
