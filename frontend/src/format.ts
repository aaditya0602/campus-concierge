// Small date/time formatting helpers shared by BusCard and EventsCard.
// All absolute times render in Blacksburg time regardless of viewer's timezone.

const TZ = 'America/New_York'

export function relativeMinutes(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now()
  const diffMin = Math.round(diffMs / 60000)
  if (Number.isNaN(diffMin)) return ''
  if (diffMin <= 0) return 'due now'
  if (diffMin === 1) return 'in 1 min'
  return `in ${diffMin} min`
}

export function absoluteTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ })
}

function dayKey(d: Date): string {
  return d.toLocaleDateString('en-US', { timeZone: TZ })
}

export function friendlyDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ })
  if (dayKey(d) === dayKey(now)) return `Today, ${time}`
  if (dayKey(d) === dayKey(tomorrow)) return `Tomorrow, ${time}`
  return `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: TZ })}, ${time}`
}
