export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto pb-12 animate-pulse">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-8 h-8 rounded-full bg-so-surface border border-so-border" />
        <div className="w-24 h-4 bg-so-surface border border-so-border rounded" />
      </div>

      {/* Hero Skeleton */}
      <div className="bg-white border border-so-border rounded-xl p-6 shadow-sm mb-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-so-surface border border-so-border" />
            <div className="space-y-2">
              <div className="w-48 h-6 bg-so-surface border border-so-border rounded" />
              <div className="w-32 h-4 bg-so-surface border border-so-border rounded" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="w-20 h-6 bg-so-surface border border-so-border rounded-full" />
            <div className="w-20 h-6 bg-so-surface border border-so-border rounded-full" />
          </div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-6 border-b border-so-border mb-6">
        <div className="w-20 h-10 bg-so-surface border-b-2 border-so-border" />
        <div className="w-24 h-10 bg-so-surface border-b-2 border-so-border" />
      </div>

      {/* Content Skeleton */}
      <div className="space-y-4">
        <div className="w-full h-48 bg-white border border-so-border rounded-xl shadow-sm" />
        <div className="w-full h-32 bg-white border border-so-border rounded-xl shadow-sm" />
      </div>
    </div>
  )
}
