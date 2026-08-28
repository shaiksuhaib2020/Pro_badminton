'use client'
import { useEffect } from 'react'

export default function StudentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-so-red font-medium">Failed to load students.</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-so-accent text-white rounded-lg text-sm font-medium"
      >
        Try Again
      </button>
    </div>
  )
}
