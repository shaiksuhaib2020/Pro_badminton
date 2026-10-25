export default function EnquiriesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-so-surface rounded w-48" />
      <div className="h-10 bg-so-surface rounded w-full max-w-2xl" />
      
      <div className="bg-so-card border border-so-border rounded-xl shadow-sm overflow-hidden">
        <div className="h-10 bg-so-surface border-b border-so-border" />
        <div className="divide-y divide-so-border">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="h-4 bg-so-surface rounded w-1/4" />
              <div className="h-4 bg-so-surface rounded w-1/6" />
              <div className="h-4 bg-so-surface rounded w-1/5" />
              <div className="h-6 bg-so-surface rounded-full w-24" />
              <div className="ml-auto h-8 bg-so-surface rounded w-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
