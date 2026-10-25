import React, { useState } from 'react'
import { Student } from '@/lib/mock-data'
import { X } from 'lucide-react'
import { formatDate, getTodayIST } from '@/lib/utils'

interface DropoutConfirmModalProps {
  student: Student
  onClose: () => void
  onConfirm: (reason: string) => void
}

export default function DropoutConfirmModal({ student, onClose, onConfirm }: DropoutConfirmModalProps) {
  const [reason, setReason] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-so-card border border-so-border rounded-2xl w-full max-w-md shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-so-border">
          <h2 className="text-lg font-semibold text-so-text">Move to Dropout</h2>
          <button onClick={onClose} className="text-so-muted hover:text-so-text transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div className="bg-so-surface rounded-lg p-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-so-muted uppercase tracking-wide">Name</p>
              <p className="text-sm font-medium text-so-text">{student.name}</p>
            </div>
            <div>
              <p className="text-xs text-so-muted uppercase tracking-wide">Phone</p>
              <p className="text-sm font-medium text-so-text">{student.phone}</p>
            </div>
            <div>
              <p className="text-xs text-so-muted uppercase tracking-wide">Guardian</p>
              <p className="text-sm font-medium text-so-text">{student.guardianName}</p>
            </div>
            <div>
              <p className="text-xs text-so-muted uppercase tracking-wide">Date</p>
              <p className="text-sm font-medium text-so-text">{formatDate(getTodayIST())}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs text-so-muted uppercase font-medium mb-1.5">
              Reason for Dropping Out
            </label>
            <textarea 
              rows={3} 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Relocated, health reasons, fees concern..."
              className="w-full px-3 py-2 bg-transparent border border-so-border rounded-lg text-sm text-so-text focus:outline-none focus:border-so-accent focus:ring-1 focus:ring-so-accent placeholder:text-so-muted resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-so-surface/50 border-t border-so-border">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-so-text border border-so-border hover:bg-so-surface transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              onConfirm(reason)
              onClose()
            }}
            disabled={reason.trim() === ''}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-so-red text-white hover:bg-so-red/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Move to Dropout
          </button>
        </div>

      </div>
    </div>
  )
}
