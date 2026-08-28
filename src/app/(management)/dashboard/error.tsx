'use client'

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-8 max-w-md text-center">
        <p className="text-so-red text-sm font-medium mb-2">Something went wrong</p>
        <p className="text-so-muted text-xs mb-6">{error.message || 'Failed to load dashboard.'}</p>
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-so-accent hover:bg-so-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
