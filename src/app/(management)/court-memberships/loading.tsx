export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="animate-pulse h-8 w-48 mb-2 bg-so-surface border border-so-border" />
          <div className="animate-pulse h-4 w-64 bg-so-surface border border-so-border" />
        </div>
        <div className="animate-pulse h-10 w-32 rounded-lg bg-so-surface border border-so-border" />
      </div>

      <div className="relative mb-4">
        <div className="animate-pulse h-10 w-full rounded-lg bg-so-surface border border-so-border" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="animate-pulse h-24 rounded-xl bg-so-surface border border-so-border" />
        <div className="animate-pulse h-24 rounded-xl bg-so-surface border border-so-border" />
        <div className="animate-pulse h-24 rounded-xl bg-so-surface border border-so-border" />
        <div className="animate-pulse h-24 rounded-xl bg-so-surface border border-so-border" />
      </div>

      <div className="flex items-center justify-between border-b border-so-border pb-4 mb-4">
        <div className="flex gap-2">
          <div className="animate-pulse h-10 w-24 bg-so-surface border border-so-border" />
          <div className="animate-pulse h-10 w-24 bg-so-surface border border-so-border" />
          <div className="animate-pulse h-10 w-24 bg-so-surface border border-so-border" />
        </div>
        <div className="flex gap-2">
          <div className="animate-pulse h-8 w-16 rounded-full bg-so-surface border border-so-border" />
          <div className="animate-pulse h-8 w-20 rounded-full bg-so-surface border border-so-border" />
          <div className="animate-pulse h-8 w-20 rounded-full bg-so-surface border border-so-border" />
        </div>
      </div>

      <div className="bg-so-card border border-so-border rounded-xl shadow-sm overflow-hidden h-96">
        <div className="animate-pulse w-full h-full bg-so-surface/50" />
      </div>
    </div>
  )
}
