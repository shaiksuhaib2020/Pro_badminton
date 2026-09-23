export default function Loading() {
  return (
    <div className="p-6 max-w-7xl mx-auto animate-pulse">
      <div className="mb-6 flex gap-3">
        <div className="w-10 h-10 bg-so-surface rounded-lg"></div>
        <div className="flex-1">
          <div className="h-8 bg-so-surface rounded w-64 mb-2"></div>
          <div className="h-4 bg-so-surface rounded w-96"></div>
        </div>
      </div>
      <div className="flex gap-4 border-b border-so-border mb-6 pb-2">
        <div className="h-6 bg-so-surface rounded w-24"></div>
        <div className="h-6 bg-so-surface rounded w-24"></div>
        <div className="h-6 bg-so-surface rounded w-24"></div>
      </div>
      <div className="h-[400px] bg-so-card border border-so-border rounded-xl shadow-sm"></div>
    </div>
  )
}
