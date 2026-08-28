'use client'

import LiveClock from './LiveClock'

export default function TopBar() {
  return (
    <header className="flex items-center justify-end mb-8">
      <LiveClock />
    </header>
  )
}
