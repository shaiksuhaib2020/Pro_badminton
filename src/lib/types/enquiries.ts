export type EnquiryStatus = 'not-scheduled' | 'scheduled' | 'completed'

export type Enquiry = {
  id: string
  name: string
  phone: string
  guardianName: string
  notes?: string
  status: EnquiryStatus
  trialDate?: string   // YYYY-MM-DD — only present when status is 'scheduled' or 'completed'
  createdAt: string    // YYYY-MM-DD
  updatedAt?: string
}
