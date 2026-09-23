'use client'

import { useState } from 'react'
import { mockSettings } from '@/lib/mock-data'
import AcademySection from './_components/AcademySection'
import BranchesSection from './_components/BranchesSection'
import StaffSection from './_components/StaffSection'
import PermissionsMatrix from './_components/PermissionsMatrix'
import MembershipSection from './_components/MembershipSection'
import EventsSection from './_components/EventsSection'

export default function SettingsPage() {
  const [, forceUpdate] = useState(0)

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-so-text">Settings</h1>
        <p className="text-so-muted text-sm mt-1">Manage your academy, branches, staff and configuration</p>
      </div>
      <AcademySection onSettingsChange={() => forceUpdate(n => n + 1)} />
      {mockSettings.multiBranchEnabled && <BranchesSection />}
      <StaffSection />
      <PermissionsMatrix />
      <MembershipSection />
      <EventsSection />
    </div>
  )
}
