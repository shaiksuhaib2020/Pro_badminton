'use client'

import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { mockSettings } from '@/lib/mock-data'

export default function CommunicationsSection() {
  const [updater, setUpdater] = useState(0)
  const forceUpdate = () => setUpdater(prev => prev + 1)

  const handleToggle = (key: 'feeReminderEnabled' | 'feeAckEnabled' | 'birthdayWishEnabled') => {
    mockSettings[key] = !mockSettings[key]
    forceUpdate()
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 text-so-text mb-1">
          <MessageCircle size={20} />
          <h2 className="text-xl font-bold">Communications</h2>
        </div>
        <p className="text-sm text-so-muted">WhatsApp message automation settings</p>
      </div>

      <div className="bg-so-card border border-so-border rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-so-text">Fee Reminder</h3>
            <p className="text-xs text-so-muted">Automatically send when a student is overdue or due soon</p>
          </div>
          <button
            onClick={() => handleToggle('feeReminderEnabled')}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${mockSettings.feeReminderEnabled ? 'bg-so-accent' : 'bg-so-border'}`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${mockSettings.feeReminderEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-so-text">Fee Acknowledgement</h3>
            <p className="text-xs text-so-muted">Automatically send when a payment is recorded</p>
          </div>
          <button
            onClick={() => handleToggle('feeAckEnabled')}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${mockSettings.feeAckEnabled ? 'bg-so-accent' : 'bg-so-border'}`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${mockSettings.feeAckEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-so-text">
              Birthday Wish <span className="text-xs text-so-muted font-normal ml-2">(coming soon)</span>
            </h3>
            <p className="text-xs text-so-muted">Automatically send on a student's birthday</p>
          </div>
          <button
            onClick={() => handleToggle('birthdayWishEnabled')}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${mockSettings.birthdayWishEnabled ? 'bg-so-accent' : 'bg-so-border'}`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${mockSettings.birthdayWishEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>
    </div>
  )
}
