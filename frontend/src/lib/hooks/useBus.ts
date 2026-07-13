// Bus data/state logic, extracted verbatim from the old BusCard.tsx so both the
// Home summary and the full /bus page share one fetch/poll implementation.
import { useEffect, useState } from 'react'
import { ApiError, busApi, type BusDeparture, type BusRoute, type BusStop } from '@/api'

export type Loadable<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T }

export function useBus() {
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

  return {
    routes,
    selectedRoute,
    setSelectedRoute,
    loadRoutes,
    stops,
    selectedStop,
    setSelectedStop,
    retryStops: () => setStopsRetryKey((k) => k + 1),
    departures,
    retryDepartures: () => setDeparturesRetryKey((k) => k + 1),
    vehicleCount,
  }
}
