export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="animate-pulse space-y-8">
        <div className="h-8 bg-so-surface w-48 rounded"></div>
        <div className="flex gap-4">
          <div className="h-10 bg-so-surface w-32 rounded"></div>
          <div className="h-10 bg-so-surface w-32 rounded"></div>
        </div>
        <div className="h-96 bg-so-surface rounded-xl border border-so-border"></div>
      </div>
    </div>
  )
}
