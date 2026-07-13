import { useEffect, useState } from 'react'
import { ApiError, diningApi, type DiningHall, type DiningMenu } from '../api'
import { CardShell, ErrorState, Skeleton } from './Shared'

type Loadable<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T }

function OpenBadge({ isOpen }: { isOpen: boolean | null }) {
  if (isOpen === null) {
    return (
      <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
        hours unknown
      </span>
    )
  }
  return isOpen ? (
    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
      open
    </span>
  ) : (
    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900 dark:text-red-300">
      closed
    </span>
  )
}

function MenuView({ menu }: { menu: DiningMenu }) {
  return (
    <div className="mt-2 space-y-2 border-l-2 border-vt-orange pl-3">
      {menu.meals.length === 0 && <p className="text-xs text-neutral-500">No menu posted for today.</p>}
      {menu.meals.map((meal) => (
        <details key={meal.name} className="text-sm">
          <summary className="cursor-pointer font-medium text-neutral-800 dark:text-neutral-200">
            {meal.name}
          </summary>
          <div className="mt-1 space-y-1 pl-3">
            {meal.stations.map((station) => (
              <div key={station.name}>
                <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">{station.name}</p>
                <ul className="list-inside list-disc text-xs text-neutral-500">
                  {station.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  )
}

export default function DiningCard() {
  const [halls, setHalls] = useState<Loadable<DiningHall[]>>({ status: 'loading' })
  const [expanded, setExpanded] = useState<string | null>(null)
  const [menus, setMenus] = useState<Record<string, Loadable<DiningMenu>>>({})

  const load = () => {
    setHalls({ status: 'loading' })
    diningApi
      .halls()
      .then((r) => setHalls({ status: 'ready', data: r.halls }))
      .catch((e: unknown) =>
        setHalls({ status: 'error', message: e instanceof ApiError ? e.message : 'Failed to load dining halls' })
      )
  }
  useEffect(load, [])

  const loadMenu = (locationNum: string) => {
    setMenus((m) => ({ ...m, [locationNum]: { status: 'loading' } }))
    diningApi
      .menu(locationNum)
      .then((menu) => setMenus((m) => ({ ...m, [locationNum]: { status: 'ready', data: menu } })))
      .catch((e: unknown) =>
        setMenus((m) => ({
          ...m,
          [locationNum]: { status: 'error', message: e instanceof ApiError ? e.message : 'Failed to load menu' },
        }))
      )
  }

  const toggle = (hall: DiningHall) => {
    if (expanded === hall.location_num) {
      setExpanded(null)
      return
    }
    setExpanded(hall.location_num)
    if (!menus[hall.location_num]) loadMenu(hall.location_num)
  }

  return (
    <CardShell title="Dining">
      {halls.status === 'loading' && <Skeleton lines={4} />}
      {halls.status === 'error' && <ErrorState message={halls.message} onRetry={load} />}
      {halls.status === 'ready' && (
        halls.data.length === 0 ? (
          <p className="text-sm text-neutral-500">No dining halls found.</p>
        ) : (
          <ul className="space-y-1.5">
            {halls.data.map((hall) => (
              <li key={hall.location_num} className="rounded-md bg-neutral-50 px-2 py-1.5 dark:bg-neutral-800">
                <button onClick={() => toggle(hall)} className="flex w-full items-center justify-between text-left">
                  <span>
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{hall.name}</span>
                    {hall.hours_today && (
                      <span className="block text-xs text-neutral-500">{hall.hours_today}</span>
                    )}
                  </span>
                  <OpenBadge isOpen={hall.is_open} />
                </button>
                {expanded === hall.location_num && (
                  <div>
                    {(!menus[hall.location_num] || menus[hall.location_num].status === 'loading') && (
                      <div className="mt-2"><Skeleton lines={2} /></div>
                    )}
                    {menus[hall.location_num]?.status === 'error' && (
                      <div className="mt-2">
                        <ErrorState
                          message={(menus[hall.location_num] as { status: 'error'; message: string }).message}
                          onRetry={() => loadMenu(hall.location_num)}
                        />
                      </div>
                    )}
                    {menus[hall.location_num]?.status === 'ready' && (
                      <MenuView menu={(menus[hall.location_num] as { status: 'ready'; data: DiningMenu }).data} />
                    )}
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
