export default function AccountsLoading() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4 animate-pulse">
      <div className="h-8 w-40 bg-so-border rounded-lg" />
      <div className="grid grid-cols-3 gap-4">
        <div className="h-24 w-full bg-so-border rounded-xl" />
        <div className="h-24 w-full bg-so-border rounded-xl" />
        <div className="h-24 w-full bg-so-border rounded-xl" />
      </div>
      <div className="h-10 w-full bg-so-border rounded-lg" />
      <div className="h-64 w-full bg-so-border rounded-xl" />
    </div>
  )
}
