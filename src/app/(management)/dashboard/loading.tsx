export default function DashboardLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
      <div className="h-7 w-32 bg-so-border rounded" />

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-so-card border border-so-border rounded-xl shadow-sm p-5">
            <div className="h-3 w-24 bg-so-border rounded mb-3" />
            <div className="h-8 w-28 bg-so-border rounded" />
          </div>
        ))}
      </div>

      {/* Schedule table skeleton */}
      <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-6">
        <div className="h-5 w-40 bg-so-border rounded mb-6" />
        <div className="h-8 w-80 bg-so-border rounded mb-6" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-so-border/50 rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}
