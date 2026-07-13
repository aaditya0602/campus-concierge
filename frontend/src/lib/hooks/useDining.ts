// Dining data/state logic, extracted verbatim from the old DiningCard.tsx.
import { useEffect, useState } from 'react'
import { ApiError, diningApi, type DiningHall, type DiningMenu } from '@/api'
import type { Loadable } from './useBus'

export function useDining() {
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

  return { halls, load, expanded, menus, loadMenu, toggle }
}
