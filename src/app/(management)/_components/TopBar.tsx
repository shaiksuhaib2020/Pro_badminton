'use client'

import { useState, useEffect, useRef } from 'react'
import LiveClock from './LiveClock'
import { mockSettings, mockBranches } from '@/lib/mock-data'
import { ChevronDown, Check } from 'lucide-react'

export default function TopBar() {
  const [activeBranchId, setActiveBranchId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ezyfee_active_branch') 
        ?? mockBranches.find(b => b.isPrimary)?.id 
        ?? ''
    }
    return ''
  })
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    const handleSettingsChange = () => forceUpdate(n => n + 1)
    
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('settingsChange', handleSettingsChange)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('settingsChange', handleSettingsChange)
    }
  }, [])

  const handleBranchSwitch = (branchId: string) => {
    setActiveBranchId(branchId)
    if (typeof window !== 'undefined') {
      localStorage.setItem('ezyfee_active_branch', branchId)
    }
    setDropdownOpen(false)
  }

  const activeBranches = mockBranches.filter(b => b.isActive)
  const activeBranch = mockBranches.find(b => b.id === activeBranchId) || activeBranches[0]

  return (
    <header className="flex items-center justify-end gap-3 mb-8">
      {mockSettings.multiBranchEnabled && (
        <>
          {activeBranches.length <= 1 ? (
            <span className="text-sm text-so-muted border border-so-border bg-so-surface rounded-full px-3 py-1">
              {activeBranch?.name}
            </span>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(o => !o)}
                className="flex items-center gap-1.5 text-sm text-so-text border border-so-border bg-so-surface rounded-full px-3 py-1 hover:bg-so-border transition-colors"
              >
                <span>{activeBranch?.name}</span>
                <ChevronDown size={13} className="text-so-muted" />
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 top-full mt-1 z-50 bg-so-card border border-so-border rounded-xl shadow-md min-w-[180px] py-1">
                  {activeBranches.map(branch => (
                    <button
                      key={branch.id}
                      onClick={() => handleBranchSwitch(branch.id)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-so-surface text-so-text"
                    >
                      <span>{branch.name}</span>
                      {branch.id === activeBranchId && <Check size={13} className="text-so-accent" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
      <LiveClock />
    </header>
  )
}

