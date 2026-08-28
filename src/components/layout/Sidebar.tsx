'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LayoutDashboard, Users, Database, CalendarDays, UserPlus, Settings, Receipt } from 'lucide-react'

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="w-5 h-5 shrink-0" strokeWidth={1.75} />,
  },
  {
    href: '/students',
    label: 'Students',
    icon: <Users className="w-5 h-5 shrink-0" strokeWidth={1.75} />,
  },
  {
    href: '/transactions',
    label: 'Fee Transactions',
    icon: <Receipt className="w-5 h-5 shrink-0" strokeWidth={1.75} />,
  },
  {
    href: '/events',
    label: 'Upcoming Events',
    icon: <CalendarDays className="w-5 h-5 shrink-0" strokeWidth={1.75} />,
  },
  { type: 'divider' },
  {
    href: '/settings',
    label: 'Settings',
    icon: <Settings className="w-5 h-5 shrink-0" strokeWidth={1.75} />,
  },
]

const PAGE_NAMES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/students': 'Students',
  '/transactions': 'Fee Transactions',
  '/events': 'Upcoming Events',
  '/settings': 'Management Settings',
}

export function getPageName(pathname: string): string {
  return PAGE_NAMES[pathname] ?? 'Pro Badminton'
}

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleSignOut() {
    setIsLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initial = userEmail ? userEmail.charAt(0).toUpperCase() : 'S'

  return (
    <aside className="w-64 h-screen bg-[#232E44] flex flex-col shrink-0 select-none">
      
      {/* ── Brand ── */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 overflow-hidden">
            <img src="/pro_logo.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-tight tracking-tight">Pro Badminton</p>
            <p className="text-xs text-white/50 mt-0.5 tracking-wide">Management System</p>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item, idx) => {
          if (item.type === 'divider') {
            return <div key={`div-${idx}`} className="border-t border-white/10 mx-3 my-2" />
          }

          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href!}
              className={`
                group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                ${isActive
                  ? 'text-white bg-white/10 border-l-2 border-so-accent'
                  : 'text-white/70 hover:bg-white/5 hover:text-white border-l-2 border-transparent'
                }
              `}
            >
              <span className={`
                shrink-0 transition-colors duration-150
                ${isActive ? 'text-white' : 'text-white/60 group-hover:text-white/90'}
              `}>
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="border-t border-white/10 px-3 py-4 mt-auto">
        <div className="flex items-center gap-3 px-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-white">{initial}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-white truncate">{userEmail}</p>
            <p className="text-xs text-white/50 mt-0.5">Staff</p>
          </div>
        </div>
        
        <button
          onClick={handleSignOut}
          className="
            group flex items-center gap-3 w-full px-3 py-2.5 rounded-lg
            text-sm font-medium text-white/70
            hover:bg-white/5 hover:text-white
            transition-colors duration-150
          "
        >
          <svg className="w-5 h-5 shrink-0 text-white/60 group-hover:text-white transition-colors duration-150" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="truncate">{isLoggingOut ? 'Signing out...' : 'Sign out'}</span>
        </button>
      </div>

    </aside>
  )
}
