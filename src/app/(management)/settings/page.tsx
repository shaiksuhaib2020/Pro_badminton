import AcademySection from './_components/AcademySection'
import StaffSection from './_components/StaffSection'
import PermissionsMatrix from './_components/PermissionsMatrix'
import CommunicationsSection from './_components/CommunicationsSection'
import EventsSection from './_components/EventsSection'

export default async function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-so-text">Settings</h1>
        <p className="text-so-muted text-sm mt-1">Manage your academy, branches, staff and configuration</p>
      </div>
      <AcademySection />
      <StaffSection />
      <PermissionsMatrix />
      <CommunicationsSection />
      <EventsSection />
    </div>
  )
}
