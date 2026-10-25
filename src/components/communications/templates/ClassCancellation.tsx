'use client'

import { useState } from 'react'
import { getTodayIST, formatDate } from '@/lib/utils'
import { mockSettings, mockStudents, mockMessageLogs, MessageLog, mockBatches } from '@/lib/mock-data'
import { CheckCircle2 } from 'lucide-react'

export default function ClassCancellation() {
  const [batchId, setBatchId] = useState('')
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  const [step, setStep] = useState<'form' | 'confirm'>('form')
  const [isSuccess, setIsSuccess] = useState(false)

  const selectedBatch = mockBatches.find(b => b.id === batchId)
  
  const eligibleStudents = mockStudents.filter(
    s => s.currentBatch === selectedBatch?.name && ['active', 'due-soon'].includes(s.status)
  )
  const recipientCount = eligibleStudents.length
  const exampleStudent = eligibleStudents[0]?.name || 'Player'
  const academyName = mockSettings.courtName

  const formattedDate = date ? formatDate(date) : '[Date]'
  const batchNameStr = selectedBatch?.name || '[Batch Name]'

  const isValid = batchId && date && reason

  const handleSend = async () => {
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: 'class-cancellation',
          batchId,
          date,
          reason,
          recipientCount
        })
      })

      if (res.ok) {
        const newLog: MessageLog = {
          id: `ml-${Date.now()}`,
          templateId: 'class-cancellation',
          sentAt: new Date().toISOString(),
          recipientCount,
          status: 'sent',
          triggeredBy: 'manual',
          note: `${batchNameStr} - ${reason}`
        }
        mockMessageLogs.push(newLog)
        setIsSuccess(true)
        setTimeout(() => {
          setIsSuccess(false)
          setStep('form')
          setBatchId('')
          setDate('')
          setReason('')
        }, 3000)
      }
    } catch (error) {
      console.error(error)
    }
  }

  if (isSuccess) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center bg-so-emerald-subtle/30 rounded-xl border border-so-emerald/20">
        <CheckCircle2 size={40} className="text-so-emerald mb-4" />
        <h3 className="text-lg font-bold text-so-text">Message Sent</h3>
        <p className="text-so-muted mt-2">Successfully sent to {recipientCount} students.</p>
      </div>
    )
  }

  if (step === 'confirm') {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
        <h3 className="font-bold text-lg text-so-text">Confirm Send</h3>
        
        <div className="bg-so-surface border border-so-border rounded-xl p-5 space-y-4">
          <p className="text-sm text-so-text whitespace-pre-wrap leading-relaxed">
            🏸 {academyName}
            <br /><br />
            Hi {exampleStudent}, your {batchNameStr} session on {formattedDate} has been cancelled due to {reason}.
            We'll resume as scheduled. Sorry for the inconvenience! 🙏
          </p>
        </div>

        <div className="bg-so-card border border-so-border rounded-xl p-4">
          <p className="text-sm text-so-text">This will send to <strong className="font-semibold">{recipientCount} students</strong> in {batchNameStr}.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSend}
            className="bg-so-accent hover:bg-so-accent/90 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Send Now
          </button>
          <button
            onClick={() => setStep('form')}
            className="bg-white border border-so-border hover:bg-so-surface text-so-text px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Back to Edit
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-so-text mb-1.5">Batch</label>
            <select
              value={batchId}
              onChange={e => setBatchId(e.target.value)}
              className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-so-accent cursor-pointer"
            >
              <option value="" disabled>Select batch</option>
              {mockBatches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-so-text mb-1.5">Date</label>
            <input
              type="date"
              min={getTodayIST()}
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-so-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-so-text mb-1.5">Reason</label>
            <textarea
              rows={2}
              placeholder="e.g. Coach unwell"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-so-accent resize-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-so-text mb-1.5">Real-time Preview</label>
          <div className="bg-so-surface border border-so-border rounded-xl p-4 h-[250px] overflow-y-auto">
            <p className="text-sm text-so-muted whitespace-pre-wrap leading-relaxed">
              🏸 {academyName}
              <br /><br />
              Hi <span className="bg-so-accent-subtle text-so-accent rounded px-1 text-xs font-mono">{"{student_name}"}</span>, your <span className="text-so-text font-medium">{batchNameStr}</span> session on <span className="text-so-text font-medium">{formattedDate}</span> has been cancelled due to <span className="text-so-text font-medium">{reason || '...'}</span>.
              We'll resume as scheduled. Sorry for the inconvenience! 🙏
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-so-border">
        <p className="text-sm text-so-muted">
          {batchId ? `Ready to send to ${recipientCount} active students in ${batchNameStr}.` : 'Select a batch to see recipient count.'}
        </p>
        <button
          onClick={() => setStep('confirm')}
          disabled={!isValid || recipientCount === 0}
          className="bg-so-accent disabled:opacity-50 hover:bg-so-accent/90 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          Preview & Send
        </button>
      </div>
    </div>
  )
}
