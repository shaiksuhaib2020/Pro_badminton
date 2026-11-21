'use client'
export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="bg-so-card border border-so-border rounded-xl shadow-sm p-5">
      <h2 className="text-lg font-semibold text-so-text">Dashboard could not load
      </h2>
      <p className="text-sm text-so-muted mt-2">The data request failed. No figures have been substituted.
      </p>
      <button onClick={reset} className="mt-4 px-4 py-2 bg-so-accent text-white rounded-lg">Try again
      </button>
    </div>)
}
