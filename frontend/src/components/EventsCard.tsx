import { useEffect, useState } from 'react'
import { ApiError, eventsApi, type CampusEvent } from '../api'
import { CardShell, ErrorState, Skeleton } from './Shared'
import { friendlyDateTime } from '../format'

type Loadable<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T }

export default function EventsCard() {
  const [events, setEvents] = useState<Loadable<CampusEvent[]>>({ status: 'loading' })

  const load = () => {
    setEvents({ status: 'loading' })
    eventsApi
      .list(14)
      .then((r) => setEvents({ status: 'ready', data: r.events }))
      .catch((e: unknown) =>
        setEvents({ status: 'error', message: e instanceof ApiError ? e.message : 'Failed to load events' })
      )
  }
  useEffect(load, [])

  return (
    <CardShell title="Events">
      {events.status === 'loading' && <Skeleton lines={5} />}
      {events.status === 'error' && <ErrorState message={events.message} onRetry={load} />}
      {events.status === 'ready' && (
        events.data.length === 0 ? (
          <p className="text-sm text-neutral-500">No upcoming events.</p>
        ) : (
          <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
            {events.data.map((ev) => (
              <li key={ev.id} className="rounded-md bg-neutral-50 p-2 dark:bg-neutral-800">
                <div className="flex items-start justify-between gap-2">
                  <a
                    href={ev.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-vt-maroon hover:underline dark:text-orange-300"
                  >
                    {ev.name}
                  </a>
                </div>
                <p className="text-xs text-neutral-500">
                  {ev.org} &middot; {friendlyDateTime(ev.starts)}
                </p>
                <p className="text-xs text-neutral-500">{ev.location}</p>
                {ev.benefits.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {ev.benefits.map((b) => (
                      <span
                        key={b}
                        className="rounded-full bg-vt-orange/15 px-2 py-0.5 text-[10px] font-medium text-vt-orange dark:text-orange-300"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )
      )}
    </CardShell>
  )
}
