// Small shared bits reused across dashboard cards: skeletons, error state, card shell.
import type { ReactNode } from 'react'

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 rounded bg-neutral-200 dark:bg-neutral-700" />
      ))}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
      <p className="mb-2">{message}</p>
      <button
        onClick={onRetry}
        className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
      >
        Retry
      </button>
    </div>
  )
}

export function CardShell({
  title,
  icon,
  children,
}: {
  title: string
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        {icon}
        {title}
      </h2>
      <div className="flex-1">{children}</div>
    </section>
  )
}
