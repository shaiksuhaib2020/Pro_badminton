/** Individual delivery outcome for a single recipient within a broadcast. */
export type RecipientStatus = 'pending' | 'sent' | 'failed' | 'delivered' | 'read'

export interface MessageRecipient {
  studentId?: string           // FK → students.id, absent for non-student recipients
  name: string                 // snapshot at send time
  phone: string                // snapshot at send time
  status: RecipientStatus      // individual delivery outcome
  errorMessage?: string        // provider error message when status === 'failed'
  deliveredAt?: string         // ISO timestamp — only when confirmed by provider
  readAt?: string              // ISO timestamp — only when confirmed by provider
}

export interface MessageLog {
  id: string
  templateId: string           // matches TEMPLATE_REGISTRY id
  sentAt: string               // ISO datetime string
  recipientCount: number       // kept for backward compat; synced with recipients.length for new records
  recipients: MessageRecipient[] // per-recipient delivery details
  triggerType: 'manual' | 'auto'
  reason?: string              // e.g. "Dussehra Holiday", "Coach unwell"
}

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
