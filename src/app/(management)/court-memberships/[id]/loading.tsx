export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto pb-12 animate-in fade-in duration-300">
      <div className="bg-white border border-so-border rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="p-6 sm:p-8 flex items-start justify-between">
          <div>
            <div className="animate-pulse h-8 w-48 mb-2 bg-so-surface border border-so-border" />
            <div className="animate-pulse h-4 w-32 mb-4 bg-so-surface border border-so-border" />
            <div className="flex gap-2">
              <div className="animate-pulse h-6 w-16 rounded-full bg-so-surface border border-so-border" />
              <div className="animate-pulse h-6 w-16 rounded-full bg-so-surface border border-so-border" />
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="animate-pulse h-6 w-20 rounded-full bg-so-surface border border-so-border" />
            <div className="flex gap-2 mt-4">
              <div className="animate-pulse h-9 w-24 rounded-lg bg-so-surface border border-so-border" />
              <div className="animate-pulse h-9 w-24 rounded-lg bg-so-surface border border-so-border" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-so-border mb-6">
        <div className="animate-pulse h-10 w-24 bg-so-surface border border-so-border" />
        <div className="animate-pulse h-10 w-24 bg-so-surface border border-so-border" />
        <div className="animate-pulse h-10 w-24 bg-so-surface border border-so-border" />
      </div>

      <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-6 h-64">
        <div className="animate-pulse w-full h-full bg-so-surface/50" />
      </div>
    </div>
  )
}
