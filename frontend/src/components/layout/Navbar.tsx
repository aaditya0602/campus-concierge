import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/bus', label: 'Bus' },
  { to: '/dining', label: 'Dining' },
  { to: '/events', label: 'Events' },
]

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return { dark, toggle: () => setDark((d) => !d) }
}

export default function Navbar() {
  const { dark, toggle } = useDarkMode()

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <NavLink to="/" className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold text-primary">Campus Concierge</span>
          <span className="text-xs font-semibold text-accent">VT</span>
        </NavLink>

        <nav className="flex items-center gap-1 overflow-x-auto">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cn(
                  'whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
          <button
            onClick={toggle}
            aria-label="Toggle dark mode"
            className="ml-1 rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </nav>
      </div>
    </header>
  )
}
