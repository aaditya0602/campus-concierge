import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ErrorState } from '@/components/Shared'
import PlanTrip from '@/components/bus/PlanTrip'
import { useBus } from '@/lib/hooks/useBus'
import { absoluteTime, relativeMinutes } from '@/format'
import { cn } from '@/lib/utils'

function readableColor(hex: string, fallback: string): string {
  return hex ? `#${hex.replace('#', '')}` : fallback
}

export default function Bus() {
  const {
    routes,
    selectedRoute,
    setSelectedRoute,
    loadRoutes,
    stops,
    selectedStop,
    setSelectedStop,
    retryStops,
    departures,
    retryDepartures,
    vehicleCount,
  } = useBus()

  return (
    <div className="page-enter container py-8">
      <h1 className="text-2xl font-bold text-primary sm:text-3xl">Bus</h1>
      <p className="mt-1 text-muted-foreground">Live Blacksburg Transit routes, stops, and departures.</p>

      {routes.status === 'loading' && <Skeleton className="mt-6 h-24 w-full" />}
      {routes.status === 'error' && (
        <div className="mt-6">
          <ErrorState message={routes.message} onRetry={loadRoutes} />
        </div>
      )}
      {routes.status === 'ready' && routes.data.length === 0 && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="pt-4 text-sm text-muted-foreground">
              No BT routes operating right now. Most routes run roughly 6 AM &ndash; 11 PM Blacksburg time.
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <PlanTrip />
            </CardContent>
          </Card>
        </div>
      )}

      {routes.status === 'ready' && routes.data.length > 0 && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Left: routes, stop selector, departures */}
          <div className="space-y-6">
            <Card className="animate-fade-up">
              <CardHeader>
                <CardTitle>Routes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {routes.data.map((r) => (
                    <button
                      key={r.short_name}
                      onClick={() => setSelectedRoute(r.short_name)}
                      style={{
                        backgroundColor: readableColor(r.color, '#630031'),
                        color: readableColor(r.text_color, '#ffffff'),
                      }}
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-semibold transition-opacity',
                        selectedRoute === r.short_name ? 'ring-2 ring-ring ring-offset-2 ring-offset-background' : 'opacity-80 hover:opacity-100'
                      )}
                      title={r.name}
                    >
                      {r.short_name}
                      {!r.realtime && ' *'}
                    </button>
                  ))}
                </div>
                {vehicleCount !== null && selectedRoute && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {vehicleCount} live vehicle{vehicleCount === 1 ? '' : 's'} on {selectedRoute}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="animate-fade-up" style={{ animationDelay: '60ms' }}>
              <CardHeader>
                <CardTitle>Stop</CardTitle>
              </CardHeader>
              <CardContent>
                {stops.status === 'loading' && <Skeleton className="h-9 w-full" />}
                {stops.status === 'error' && <ErrorState message={stops.message} onRetry={retryStops} />}
                {stops.status === 'ready' && (
                  <Select value={selectedStop ?? undefined} onValueChange={setSelectedStop}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a stop" />
                    </SelectTrigger>
                    <SelectContent>
                      {stops.data.map((s) => (
                        <SelectItem key={s.code} value={s.code}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>

            <Card className="animate-fade-up" style={{ animationDelay: '120ms' }}>
              <CardHeader>
                <CardTitle>Next departures</CardTitle>
              </CardHeader>
              <CardContent>
                {departures.status === 'loading' && (
                  <div className="space-y-2">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                )}
                {departures.status === 'error' && (
                  <ErrorState message={departures.message} onRetry={retryDepartures} />
                )}
                {departures.status === 'ready' &&
                  (departures.data.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No upcoming departures.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {departures.data.map((d, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between rounded-md bg-secondary px-3 py-2 text-sm"
                        >
                          <span className="font-medium">{d.route}</span>
                          <span className="text-muted-foreground">
                            {relativeMinutes(d.time)} &middot; {absoluteTime(d.time)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ))}
              </CardContent>
            </Card>
          </div>

          {/* Right: trip planner */}
          <Card className="h-fit animate-fade-up" style={{ animationDelay: '80ms' }}>
            <CardHeader>
              <CardTitle>Trip planner</CardTitle>
            </CardHeader>
            <CardContent>
              <PlanTrip />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
