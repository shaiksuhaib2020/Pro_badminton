'use client'

import { useState, useEffect } from 'react'

export default function LiveClock() {
  const [timeStr, setTimeStr] = useState('')

  useEffect(() => {
    function updateClock() {
      const now = new Date()
      const str = now.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      })
      setTimeStr(str)
    }
    updateClock() // Initial setting
    const interval = setInterval(updateClock, 1000)
    return () => clearInterval(interval)
  }, [])

  if (!timeStr) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-so-surface" />
        <span className="text-sm text-so-surface font-mono">--:--:-- -- IST</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-so-accent animate-pulse" />
      <span className="text-sm text-so-muted font-mono">{timeStr} IST</span>
    </div>
  )
}
