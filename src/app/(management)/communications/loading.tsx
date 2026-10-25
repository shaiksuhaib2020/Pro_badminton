export default function CommunicationsLoading() {
  return (
    <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
      <div>
        <div className="h-8 w-48 bg-so-surface animate-pulse rounded-md mb-2"></div>
        <div className="h-4 w-72 bg-so-surface animate-pulse rounded-md"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="bg-so-surface animate-pulse rounded-2xl h-[120px]"></div>
        ))}
      </div>
    </div>
  )
}
