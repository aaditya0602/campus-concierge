// Events data/state logic, extracted verbatim from the old EventsCard.tsx.
import { useEffect, useState } from 'react'
import { ApiError, eventsApi, type CampusEvent } from '@/api'
import type { Loadable } from './useBus'

export function useEvents(days = 14) {
  const [events, setEvents] = useState<Loadable<CampusEvent[]>>({ status: 'loading' })

  const load = () => {
    setEvents({ status: 'loading' })
    eventsApi
      .list(days)
      .then((r) => setEvents({ status: 'ready', data: r.events }))
      .catch((e: unknown) =>
        setEvents({ status: 'error', message: e instanceof ApiError ? e.message : 'Failed to load events' })
      )
  }
  useEffect(load, [])

  return { events, load }
}
