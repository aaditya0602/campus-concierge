// Shared error state, re-skinned with shadcn Button. Skeleton/CardShell were
// superseded by src/components/ui/skeleton.tsx and src/components/ui/card.tsx.
import { Button } from '@/components/ui/button'

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      <p className="mb-2">{message}</p>
      <Button size="sm" variant="destructive" onClick={onRetry}>
        Retry
      </Button>
    </div>
  )
}
