export default function EventsLoading() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-so-border rounded-lg" />
      <div className="h-10 w-full bg-so-border rounded-lg" />
      <div className="grid grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 w-full bg-so-border rounded-lg" />
        ))}
      </div>
    </div>
  )
}
