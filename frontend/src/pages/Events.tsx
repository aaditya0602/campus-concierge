import { useMemo, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/Shared'
import { useEvents } from '@/lib/hooks/useEvents'
import { friendlyDateTime } from '@/format'
import { cn } from '@/lib/utils'

type Filter = 'all' | 'free-food' | 'this-week'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'free-food', label: 'Free Food' },
  { key: 'this-week', label: 'This Week' },
]

export default function Events() {
  const { events, load } = useEvents(14)
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => {
    if (events.status !== 'ready') return []
    const now = Date.now()
    const weekMs = 7 * 24 * 60 * 60 * 1000
    return events.data.filter((ev) => {
      if (filter === 'free-food' && !ev.benefits.some((b) => b.toLowerCase().includes('food'))) return false
      if (filter === 'this-week' && new Date(ev.starts).getTime() - now > weekMs) return false
      return true
    })
  }, [events, filter])

  return (
    <div className="page-enter container py-8">
      <h1 className="text-2xl font-bold text-primary sm:text-3xl">Events</h1>
      <p className="mt-1 text-muted-foreground">What&apos;s happening on campus in the next two weeks.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              filter === f.key
                ? 'bg-accent text-accent-foreground'
                : 'bg-secondary text-secondary-foreground hover:opacity-80'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {events.status === 'loading' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        )}
        {events.status === 'error' && <ErrorState message={events.message} onRetry={load} />}
        {events.status === 'ready' &&
          (filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events match this filter.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((ev, i) => (
                <Card
                  key={ev.id}
                  className="flex animate-fade-up flex-col transition-transform hover:-translate-y-0.5 hover:shadow-md"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <CardHeader>
                    <CardTitle className="text-base leading-snug">{ev.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {ev.org} &middot; {friendlyDateTime(ev.starts)}
                    </p>
                    <p className="text-xs text-muted-foreground">{ev.location}</p>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col justify-between gap-3">
                    <div>
                      {ev.benefits.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {ev.benefits.map((b) => (
                            <Badge key={b} variant={b.toLowerCase().includes('food') ? 'accent' : 'secondary'}>
                              {b}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button asChild size="sm" variant="outline" className="self-start gap-1.5">
                      <a href={ev.url} target="_blank" rel="noreferrer">
                        Details <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
      </div>
    </div>
  )
}
