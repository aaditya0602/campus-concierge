// Trip planner form + step timeline. Re-skin of the old BusCard.tsx PlanTrip with identical logic.
import { useState, type FormEvent } from 'react'
import { ApiError, busApi, type PlanResponse } from '@/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/Shared'

type Loadable<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T }

export default function PlanTrip() {
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [plan, setPlan] = useState<Loadable<PlanResponse> | null>(null)

  const runPlan = () => {
    if (!origin.trim() || !destination.trim()) return
    setPlan({ status: 'loading' })
    busApi
      .plan(origin.trim(), destination.trim())
      .then((r) => setPlan({ status: 'ready', data: r }))
      .catch((e: unknown) =>
        setPlan({ status: 'error', message: e instanceof ApiError ? e.message : 'Failed to plan trip' })
      )
  }
  const submitPlan = (e: FormEvent) => {
    e.preventDefault()
    runPlan()
  }

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Plan a trip</p>
      <form onSubmit={submitPlan} className="space-y-2">
        <Input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Origin" />
        <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Destination" />
        <Button type="submit" className="w-full">
          Plan trip
        </Button>
      </form>

      {plan?.status === 'loading' && <div className="mt-3"><Skeleton className="h-4 w-full" /><Skeleton className="mt-2 h-4 w-3/4" /></div>}
      {plan?.status === 'error' && (
        <div className="mt-3">
          <ErrorState message={plan.message} onRetry={runPlan} />
        </div>
      )}
      {plan?.status === 'ready' && (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-medium">{plan.data.duration_text}</p>
          <ol className="space-y-2 border-l-2 border-accent pl-3">
            {plan.data.steps.map((s, i) => (
              <li key={i} className="animate-fade-up text-xs text-muted-foreground" style={{ animationDelay: `${i * 60}ms` }}>
                <span className="font-semibold text-foreground">{s.mode}</span> {s.instruction}
                {s.line && ` (${s.line})`} &middot; {s.duration_text}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
