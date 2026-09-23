'use client'

import { useState } from 'react'
import { mockSettings } from '@/lib/mock-data'
import { Building2, Pencil, Camera, Check } from 'lucide-react'

export default function AcademySection({ onSettingsChange }: { onSettingsChange?: () => void }) {
  const [, forceUpdate] = useState(0)

  const [isEditing, setIsEditing] = useState(false)
  const [academyName, setAcademyName] = useState(mockSettings.courtName || 'EzyFee Badminton Academy')
  const [phone, setPhone] = useState(mockSettings.tenantPhone || '9876500000')
  const [address, setAddress] = useState(mockSettings.tenantAddress || 'Gachibowli, Hyderabad')
  const [savedToast, setSavedToast] = useState(false)

  const handleSave = () => {
    if (!academyName.trim()) return
    mockSettings.courtName = academyName.trim()
    mockSettings.tenantPhone = phone.trim()
    mockSettings.tenantAddress = address.trim()
    setIsEditing(false)
    setSavedToast(true)
    setTimeout(() => setSavedToast(false), 2000)
    forceUpdate(n => n + 1)
  }

  const handleCancel = () => {
    setAcademyName(mockSettings.courtName || 'EzyFee Badminton Academy')
    setPhone(mockSettings.tenantPhone || '9876500000')
    setAddress(mockSettings.tenantAddress || 'Gachibowli, Hyderabad')
    setIsEditing(false)
  }

  const handleToggleCourtMembership = () => {
    mockSettings.courtMembershipEnabled = !mockSettings.courtMembershipEnabled
    forceUpdate(n => n + 1)
    onSettingsChange?.()
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('settingsChange'))
  }

  const handleToggleMultiBranch = () => {
    mockSettings.multiBranchEnabled = !mockSettings.multiBranchEnabled
    forceUpdate(n => n + 1)
    onSettingsChange?.()
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('settingsChange'))
  }

  return (
    <div className="bg-so-card border border-so-border rounded-2xl p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-so-accent/10 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-so-accent" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-so-text">Academy & Branding</h2>
            <p className="text-xs text-so-muted">Tenant-level profile visible across all branches</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {savedToast && (
            <span className="text-xs font-semibold text-so-emerald bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-md flex items-center gap-1 animate-in fade-in">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 text-so-muted hover:text-so-accent rounded-lg border border-so-border hover:border-so-accent transition-colors"
              title="Edit Profile"
            >
              <Pencil className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="px-3 py-1 text-xs font-semibold text-so-muted hover:text-so-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3.5 py-1 bg-so-accent text-white rounded-lg text-xs font-bold hover:bg-so-accent/90 transition-colors shadow-sm"
              >
                Save
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
        <div>
          <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">
            Academy Name
          </label>
          {isEditing ? (
            <input
              type="text"
              value={academyName}
              onChange={e => setAcademyName(e.target.value)}
              className="w-full bg-white border border-so-border rounded-xl px-3.5 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
            />
          ) : (
            <p className="text-sm font-bold text-so-text bg-so-surface/50 border border-so-border/60 rounded-xl px-3.5 py-2">
              {mockSettings.courtName}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">
            Contact Phone
          </label>
          {isEditing ? (
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full bg-white border border-so-border rounded-xl px-3.5 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
            />
          ) : (
            <p className="text-sm text-so-text bg-so-surface/50 border border-so-border/60 rounded-xl px-3.5 py-2">
              {mockSettings.tenantPhone || '9876500000'}
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">
            Address
          </label>
          {isEditing ? (
            <textarea
              rows={2}
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full bg-white border border-so-border rounded-xl px-3.5 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent resize-none"
            />
          ) : (
            <p className="text-sm text-so-text bg-so-surface/50 border border-so-border/60 rounded-xl px-3.5 py-2">
              {mockSettings.tenantAddress || 'Gachibowli, Hyderabad'}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">
            Timezone
          </label>
          <div className="text-sm text-so-text bg-so-surface/50 border border-so-border/60 rounded-xl px-3.5 py-2 font-mono">
            Asia/Kolkata (IST)
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-so-muted uppercase tracking-wider mb-2">
            Logo
          </label>
          <div className="flex items-center gap-3 p-2 bg-so-surface border border-dashed border-so-border rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-so-border/60 text-so-muted flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <span className="text-xs text-so-muted font-medium">Upload logo</span>
          </div>
        </div>
      </div>

      {/* Features Block */}
      <div className="border-t border-so-border pt-5">
        <h3 className="text-xs font-bold text-so-muted uppercase tracking-wider mb-3">Features</h3>
        <div className="space-y-3">
          <div className="bg-so-surface/50 border border-so-border rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-so-text">Court Membership</p>
              <p className="text-xs text-so-muted mt-0.5">Enable the court module for session and monthly access plans</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={mockSettings.courtMembershipEnabled}
                onChange={handleToggleCourtMembership}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-so-emerald relative"></div>
            </label>
          </div>
          
          <div className="bg-so-surface/50 border border-so-border rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-so-text">Multi-Branch</p>
              <p className="text-xs text-so-muted mt-0.5">Manage multiple branch locations from one account.<br/>When enabled, branch management appears in Settings and a branch switcher becomes available across the app.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={mockSettings.multiBranchEnabled}
                onChange={handleToggleMultiBranch}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-so-emerald relative"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

