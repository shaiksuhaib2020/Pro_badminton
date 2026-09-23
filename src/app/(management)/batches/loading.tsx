export default function Loading() {
  return (
    <div className="p-6 max-w-7xl mx-auto animate-pulse">
      <div className="mb-8">
        <div className="h-8 bg-so-surface rounded w-48 mb-2"></div>
        <div className="h-4 bg-so-surface rounded w-96"></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-so-card border border-so-border rounded-xl p-5 shadow-sm h-48"></div>
        ))}
      </div>
    </div>
  )
}
