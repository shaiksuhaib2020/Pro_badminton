'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { mockMessageLogs } from '@/lib/mock-data'
import TemplateCard from '@/components/communications/TemplateCard'
import TemplateDetailShell from '@/components/communications/TemplateDetailShell'
import FeeReminder from '@/components/communications/templates/FeeReminder'
import FeeAcknowledgement from '@/components/communications/templates/FeeAcknowledgement'
import DeclareHoliday from '@/components/communications/templates/DeclareHoliday'
import DeclareHolidayRange from '@/components/communications/templates/DeclareHolidayRange'
import ClassCancellation from '@/components/communications/templates/ClassCancellation'
import BirthdayWish from '@/components/communications/templates/BirthdayWish'

export type TemplateId =
  | 'fee-reminder' | 'fee-acknowledgement'
  | 'declare-holiday' | 'declare-holiday-range'
  | 'class-cancellation' | 'birthday-wish'

export interface TemplateMeta {
  id: TemplateId
  name: string
  description: string
  category: 'automated' | 'manual'
  recipientSummary: string
}

export const TEMPLATE_REGISTRY: TemplateMeta[] = [
  { id: 'fee-reminder',          name: 'Fee Reminder',          description: 'Automated reminder to students with overdue or pending fees',  category: 'automated', recipientSummary: 'Students with status: due-soon or expired'  },
  { id: 'fee-acknowledgement',   name: 'Fee Acknowledgement',   description: 'Confirmation sent when a payment is recorded',                 category: 'automated', recipientSummary: 'Student whose payment was just received'         },
  { id: 'declare-holiday',       name: 'Declare Holiday',       description: 'Notify all active students about a single day off',            category: 'manual',    recipientSummary: 'All active students'                            },
  { id: 'declare-holiday-range', name: 'Declare Holidays',      description: 'Notify all active students about multiple consecutive days off',category: 'manual',    recipientSummary: 'All active students'                            },
  { id: 'class-cancellation',    name: 'Class Cancellation',    description: 'Inform a specific batch about a cancelled session',            category: 'manual',    recipientSummary: 'Students in selected batch'                     },
  { id: 'birthday-wish',         name: 'Birthday Wish',         description: 'Automated greeting to students on their birthday',            category: 'automated', recipientSummary: "Students whose birthday is today"               },
]

export default function CommunicationsPage() {
  const [selectedId, setSelectedId] = useState<TemplateId | null>(null)

  if (selectedId) {
    const meta = TEMPLATE_REGISTRY.find(t => t.id === selectedId)!
    return (
      <div className="p-6 max-w-4xl mx-auto w-full">
        <TemplateDetailShell id={selectedId} name={meta.name} onBack={() => setSelectedId(null)}>
          {selectedId === 'fee-reminder'          && <FeeReminder />}
          {selectedId === 'fee-acknowledgement'   && <FeeAcknowledgement />}
          {selectedId === 'declare-holiday'       && <DeclareHoliday />}
          {selectedId === 'declare-holiday-range' && <DeclareHolidayRange />}
          {selectedId === 'class-cancellation'    && <ClassCancellation />}
          {selectedId === 'birthday-wish'         && <BirthdayWish />}
        </TemplateDetailShell>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto w-full space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h1 className="text-2xl font-bold text-so-text">Communications</h1>
        <p className="text-so-muted mt-1">WhatsApp message templates for your academy</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {TEMPLATE_REGISTRY.map(template => {
          const logs = mockMessageLogs
            .filter(log => log.templateId === template.id)
            .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
          
          const lastSentStr = logs.length > 0 
            ? `Last sent ${format(parseISO(logs[0].sentAt), 'dd MMM yyyy')}` 
            : 'Not sent yet'
          
          return (
            <TemplateCard
              key={template.id}
              meta={template}
              lastSent={lastSentStr}
              onClick={() => setSelectedId(template.id)}
            />
          )
        })}
      </div>
    </div>
  )
}
