import { Link } from 'react-router-dom'
import { ArrowRight, Bus, Calendar, Utensils } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/Shared'
import { useBus } from '@/lib/hooks/useBus'
import { useDining } from '@/lib/hooks/useDining'
import { useEvents } from '@/lib/hooks/useEvents'
import { absoluteTime, relativeMinutes, friendlyDateTime } from '@/format'

function ViewAll({ to }: { to: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
      View all <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  )
}

function BusSummary() {
  const { routes, loadRoutes, departures } = useBus()
  return (
    <Card className="flex h-full flex-col animate-fade-up">
      <CardHeader>
        <CardTitle>
          <Bus className="h-5 w-5 text-primary" /> Bus
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-3">
        <div>
          {routes.status === 'loading' && <Skeleton className="h-16 w-full" />}
          {routes.status === 'error' && <ErrorState message={routes.message} onRetry={loadRoutes} />}
          {routes.status === 'ready' && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {routes.data.slice(0, 6).map((r) => (
                  <span
                    key={r.short_name}
                    style={{ backgroundColor: `#${r.color.replace('#', '')}` || '#630031', color: `#${r.text_color.replace('#', '')}` || '#fff' }}
                    className="rounded-full px-2 py-0.5 text-xs font-semibold"
                  >
                    {r.short_name}
                  </span>
                ))}
                {routes.data.length === 0 && <p className="text-sm text-muted-foreground">No routes running now.</p>}
              </div>
              {departures.status === 'ready' && departures.data[0] && (
                <p className="text-sm text-muted-foreground">
                  Next: <span className="font-medium text-foreground">{departures.data[0].route}</span>{' '}
                  {relativeMinutes(departures.data[0].time)} ({absoluteTime(departures.data[0].time)})
                </p>
              )}
            </div>
          )}
        </div>
        <ViewAll to="/bus" />
      </CardContent>
    </Card>
  )
}

function DiningSummary() {
  const { halls, load } = useDining()
  return (
    <Card className="flex h-full flex-col animate-fade-up" style={{ animationDelay: '80ms' }}>
      <CardHeader>
        <CardTitle>
          <Utensils className="h-5 w-5 text-primary" /> Dining
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-3">
        <div>
          {halls.status === 'loading' && <Skeleton className="h-16 w-full" />}
          {halls.status === 'error' && <ErrorState message={halls.message} onRetry={load} />}
          {halls.status === 'ready' && (
            <ul className="space-y-1.5">
              {halls.data.slice(0, 4).map((hall) => (
                <li key={hall.location_num} className="flex items-center justify-between text-sm">
                  <span className="truncate pr-2">{hall.name}</span>
                  {hall.is_open === null ? (
                    <Badge variant="secondary">unknown</Badge>
                  ) : hall.is_open ? (
                    <Badge variant="success">open</Badge>
                  ) : (
                    <Badge variant="destructive">closed</Badge>
                  )}
                </li>
              ))}
              {halls.data.length === 0 && <p className="text-sm text-muted-foreground">No dining halls found.</p>}
            </ul>
          )}
        </div>
        <ViewAll to="/dining" />
      </CardContent>
    </Card>
  )
}

function EventsSummary() {
  const { events, load } = useEvents(14)
  return (
    <Card className="flex h-full flex-col animate-fade-up" style={{ animationDelay: '160ms' }}>
      <CardHeader>
        <CardTitle>
          <Calendar className="h-5 w-5 text-primary" /> Events
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-3">
        <div>
          {events.status === 'loading' && <Skeleton className="h-16 w-full" />}
          {events.status === 'error' && <ErrorState message={events.message} onRetry={load} />}
          {events.status === 'ready' && (
            <ul className="space-y-2">
              {events.data.slice(0, 3).map((ev) => (
                <li key={ev.id} className="text-sm">
                  <p className="truncate font-medium">{ev.name}</p>
                  <p className="text-xs text-muted-foreground">{friendlyDateTime(ev.starts)}</p>
                </li>
              ))}
              {events.data.length === 0 && <p className="text-sm text-muted-foreground">No upcoming events.</p>}
            </ul>
          )}
        </div>
        <ViewAll to="/events" />
      </CardContent>
    </Card>
  )
}

export default function Home() {
  return (
    <div className="page-enter">
      <section className="bg-gradient-to-b from-primary/10 to-transparent">
        <div className="container py-16 text-center sm:py-20">
          <h1 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-primary sm:text-5xl">
            Everything Virginia Tech, one place
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground sm:text-lg">
            Live buses, dining hours, and campus events with an assistant that can answer your questions.
          </p>
        </div>
      </section>

      <main className="container pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          <BusSummary />
          <DiningSummary />
          <EventsSummary />
        </div>
      </main>
    </div>
  )
}
