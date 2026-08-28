export default function StatusBadge({ status }: { status: string }) {
  let colors = 'bg-so-surface text-so-grey border border-so-border'

  if (status === 'Available') {
    colors = 'bg-so-emerald-subtle text-so-emerald'
  } else if (status === 'Booked') {
    colors = 'bg-so-red-subtle text-so-red'
  } else if (status === 'Blocked') {
    colors = 'bg-so-surface text-so-grey border border-so-border'
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors}`}>
      {status}
    </span>
  )
}
