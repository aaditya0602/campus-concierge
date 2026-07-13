import { useEffect, useState, type FormEvent } from 'react'
import {
  ApiError,
  busApi,
  type BusDeparture,
  type BusRoute,
  type BusStop,
  type PlanResponse,
} from '../api'
import { CardShell, ErrorState, Skeleton } from './Shared'
import { absoluteTime, relativeMinutes } from '../format'

type Loadable<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T }

function readableColor(hex: string, fallback: string): string {
  return hex ? `#${hex.replace('#', '')}` : fallback
}

function PlanTrip() {
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [plan, setPlan] = useState<Loadable<PlanResponse> | null>(null)

  const runPlan = () => {
    if (!origin.trim() || !destination.trim()) return
    setPlan({ status: 'loading' })
    busApi
      .plan(origin.trim(), destination.trim())
      .then((r) => setPlan({ status: 'ready', data: r }))
      .catch((e: unknown) =>
        setPlan({ status: 'error', message: e instanceof ApiError ? e.message : 'Failed to plan trip' })
      )
  }
  const submitPlan = (e: FormEvent) => {
    e.preventDefault()
    runPlan()
  }

  return (
    <div className="border-t border-neutral-200 pt-3 dark:border-neutral-800">
      <p className="mb-1 text-xs font-medium uppercase text-neutral-500">Plan a trip</p>
      <form onSubmit={submitPlan} className="space-y-1.5">
        <input
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          placeholder="Origin"
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
        />
        <input
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Destination"
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
        />
        <button
          type="submit"
          className="w-full rounded-md bg-vt-maroon px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
        >
          Plan trip
        </button>
      </form>

      {plan?.status === 'loading' && <div className="mt-2"><Skeleton lines={2} /></div>}
      {plan?.status === 'error' && (
        <div className="mt-2">
          <ErrorState message={plan.message} onRetry={runPlan} />
        </div>
      )}
      {plan?.status === 'ready' && (
        <div className="mt-2 space-y-1.5">
          <p className="text-sm font-medium">{plan.data.duration_text}</p>
          <ol className="space-y-1 border-l-2 border-vt-orange pl-3">
            {plan.data.steps.map((s, i) => (
              <li key={i} className="text-xs text-neutral-600 dark:text-neutral-400">
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{s.mode}</span>{' '}
                {s.instruction}
                {s.line && ` (${s.line})`} &middot; {s.duration_text}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

export default function BusCard() {
  const [routes, setRoutes] = useState<Loadable<BusRoute[]>>({ status: 'loading' })
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)

  const [stops, setStops] = useState<Loadable<BusStop[]>>({ status: 'loading' })
  const [selectedStop, setSelectedStop] = useState<string | null>(null)

  const [departures, setDepartures] = useState<Loadable<BusDeparture[]>>({ status: 'loading' })
  const [vehicleCount, setVehicleCount] = useState<number | null>(null)

  // Bump these to force a retry effect run without changing the underlying selection.
  const [stopsRetryKey, setStopsRetryKey] = useState(0)
  const [departuresRetryKey, setDeparturesRetryKey] = useState(0)

  // Load routes once.
  const loadRoutes = () => {
    setRoutes({ status: 'loading' })
    busApi
      .routes()
      .then((r) => {
        setRoutes({ status: 'ready', data: r.routes })
        if (r.routes.length > 0) setSelectedRoute(r.routes[0].short_name)
      })
      .catch((e: unknown) =>
        setRoutes({ status: 'error', message: e instanceof ApiError ? e.message : 'Failed to load routes' })
      )
  }
  useEffect(loadRoutes, [])

  // Load stops when route changes.
  useEffect(() => {
    if (!selectedRoute) return
    setStops({ status: 'loading' })
    setSelectedStop(null)
    busApi
      .stops(selectedRoute)
      .then((r) => {
        setStops({ status: 'ready', data: r.stops })
        if (r.stops.length > 0) setSelectedStop(r.stops[0].code)
      })
      .catch((e: unknown) =>
        setStops({ status: 'error', message: e instanceof ApiError ? e.message : 'Failed to load stops' })
      )
  }, [selectedRoute, stopsRetryKey])

  // Load + poll departures when route/stop changes.
  useEffect(() => {
    if (!selectedRoute || !selectedStop) return
    const load = () => {
      busApi
        .departures(selectedStop, selectedRoute, 3)
        .then((r) => setDepartures({ status: 'ready', data: r.departures }))
        .catch((e: unknown) =>
          setDepartures({
            status: 'error',
            message: e instanceof ApiError ? e.message : 'Failed to load departures',
          })
        )
    }
    setDepartures({ status: 'loading' })
    load()
    const id = setInterval(() => {
      if (!document.hidden) load()
    }, 30000)
    return () => clearInterval(id)
  }, [selectedRoute, selectedStop, departuresRetryKey])

  // Poll live vehicle count for the selected route every 15s while tab visible.
  useEffect(() => {
    if (!selectedRoute) return
    let cancelled = false
    const load = () => {
      busApi
        .vehicles()
        .then((r) => {
          if (cancelled) return
          setVehicleCount(r.vehicles.filter((v) => v.route === selectedRoute).length)
        })
        .catch(() => {
          if (!cancelled) setVehicleCount(null)
        })
    }
    load()
    const id = setInterval(() => {
      if (!document.hidden) load()
    }, 15000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [selectedRoute])

  return (
    <CardShell title="Bus">
      {routes.status === 'loading' && <Skeleton lines={3} />}
      {routes.status === 'error' && <ErrorState message={routes.message} onRetry={loadRoutes} />}
      {routes.status === 'ready' && routes.data.length === 0 && (
        <div className="space-y-4">
          <p className="text-sm text-neutral-500">
            No BT routes operating right now. Most routes run roughly 6 AM &ndash; 11 PM Blacksburg time.
          </p>
          <PlanTrip />
        </div>
      )}
      {routes.status === 'ready' && routes.data.length > 0 && (
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-neutral-500">Route</p>
            <div className="flex flex-wrap gap-1.5">
              {routes.data.map((r) => (
                <button
                  key={r.short_name}
                  onClick={() => setSelectedRoute(r.short_name)}
                  style={{
                    backgroundColor: readableColor(r.color, '#861F41'),
                    color: readableColor(r.text_color, '#ffffff'),
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-opacity ${
                    selectedRoute === r.short_name ? 'ring-2 ring-offset-1 ring-vt-orange' : 'opacity-80 hover:opacity-100'
                  }`}
                  title={r.name}
                >
                  {r.short_name}
                  {!r.realtime && ' *'}
                </button>
              ))}
            </div>
            {vehicleCount !== null && selectedRoute && (
              <p className="mt-1 text-xs text-neutral-500">
                {vehicleCount} live vehicle{vehicleCount === 1 ? '' : 's'} on {selectedRoute}
              </p>
            )}
          </div>

          {stops.status === 'loading' && <Skeleton lines={1} />}
          {stops.status === 'error' && <ErrorState message={stops.message} onRetry={() => setStopsRetryKey((k) => k + 1)} />}
          {stops.status === 'ready' && (
            <div>
              <label className="mb-1 block text-xs font-medium uppercase text-neutral-500" htmlFor="stop-select">
                Stop
              </label>
              <select
                id="stop-select"
                value={selectedStop ?? ''}
                onChange={(e) => setSelectedStop(e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              >
                {stops.data.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <p className="mb-1 text-xs font-medium uppercase text-neutral-500">Next departures</p>
            {departures.status === 'loading' && <Skeleton lines={2} />}
            {departures.status === 'error' && (
              <ErrorState message={departures.message} onRetry={() => setDeparturesRetryKey((k) => k + 1)} />
            )}
            {departures.status === 'ready' && (
              departures.data.length === 0 ? (
                <p className="text-sm text-neutral-500">No upcoming departures.</p>
              ) : (
                <ul className="space-y-1">
                  {departures.data.map((d, i) => (
                    <li key={i} className="flex items-center justify-between rounded-md bg-neutral-50 px-2 py-1 text-sm dark:bg-neutral-800">
                      <span className="font-medium">{d.route}</span>
                      <span className="text-neutral-500">
                        {relativeMinutes(d.time)} &middot; {absoluteTime(d.time)}
                      </span>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>

          <PlanTrip />
        </div>
      )}
    </CardShell>
  )
}
