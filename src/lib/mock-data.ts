export type PaymentEntry = {
  id: string
  date: string
  amount: number
  remainingAmount: number
  paymentType: 'full' | 'partial' | 'advance'
  monthsCovered: number
  paymentMethod: 'cash' | 'upi' | 'card' | 'other'
  status: 'active' | 'inactive' | 'deleted'
  note: string
}

export type Student = {
  id: string
  name: string
  phone: string
  alternatePhone: string
  guardianName: string
  membershipTypeId: string
  currentBatch: string
  fees: number
  startDate: string
  membershipStartDate: string
  nextDueDate: string
  status: 'active' | 'due-soon' | 'expired' | 'off-court'
  pendingAmount: number
  internalNotes: string
  paymentHistory: PaymentEntry[]
}

export type MembershipType = {
  id: string
  name: string
  durationType: 'months' | 'days'
  duration: number
  price: number
}

export type Event = {
  id: string
  name: string
  type: 'tournament' | 'sports-meet' | 'general'
  date: string
  description: string
}

export type Settings = {
  courtName: string
  membershipTypes: MembershipType[]
  batches: string[]
}

export let mockSettings: Settings = {
  courtName: 'FlyingGravity Badminton Academy',
  batches: ['Morning', 'Evening'],
  membershipTypes: [
    { id: 'monthly',   name: 'Monthly',   durationType: 'months', duration: 1,  price: 1500  },
    { id: 'quarterly', name: 'Quarterly', durationType: 'months', duration: 3,  price: 4000  },
    { id: 'annual',    name: 'Annual',    durationType: 'months', duration: 12, price: 14000 },
  ]
}

export let mockEvents: Event[] = [
  { id: '1', name: 'Summer Tournament 2026', type: 'tournament', date: '2026-09-15', description: 'Annual inter-batch badminton tournament. All students eligible.' },
  { id: '2', name: 'Sports Meet', type: 'sports-meet', date: '2026-10-02', description: 'Multi-sport event for all academy members and families.' },
  { id: '3', name: 'Academy Closed  Maintenance', type: 'general', date: '2026-07-20', description: 'Courts closed for maintenance. This event is past  tests auto-hide.' }
]

export let mockStudents: Student[] = [
  {
    id: 's1', name: 'Kabir Singh', phone: '9876543214', alternatePhone: '9876543200', guardianName: 'Ramesh Singh',
    membershipTypeId: 'monthly', currentBatch: 'Morning', fees: 1500, startDate: '2026-01-01', membershipStartDate: '2026-08-01',
    nextDueDate: '2026-09-01', status: 'due-soon', pendingAmount: 0, internalNotes: '',
    paymentHistory: [
      { id: 'p1', date: '2026-01-01', amount: 1500, remainingAmount: 0, paymentType: 'full', monthsCovered: 1, paymentMethod: 'upi', status: 'active', note: '' },
      { id: 'p2', date: '2026-02-01', amount: 1500, remainingAmount: 0, paymentType: 'full', monthsCovered: 1, paymentMethod: 'upi', status: 'active', note: '' },
      { id: 'p3', date: '2026-08-01', amount: 1500, remainingAmount: 0, paymentType: 'full', monthsCovered: 1, paymentMethod: 'upi', status: 'active', note: '' }
    ]
  },
  {
    id: 's2', name: 'Aditi Rao', phone: '9876543215', alternatePhone: '', guardianName: 'Sunita Rao',
    membershipTypeId: 'quarterly', currentBatch: 'Evening', fees: 4000, startDate: '2026-02-01', membershipStartDate: '2026-06-01',
    nextDueDate: '2026-09-01', status: 'due-soon', pendingAmount: 0, internalNotes: '',
    paymentHistory: [
      { id: 'p4', date: '2026-02-01', amount: 4000, remainingAmount: 0, paymentType: 'full', monthsCovered: 3, paymentMethod: 'cash', status: 'active', note: '' },
      { id: 'p5', date: '2026-06-01', amount: 4000, remainingAmount: 0, paymentType: 'full', monthsCovered: 3, paymentMethod: 'cash', status: 'active', note: '' }
    ]
  },
  {
    id: 's3', name: 'Aryan Das', phone: '9876543216', alternatePhone: '', guardianName: 'Priya Das',
    membershipTypeId: 'monthly', currentBatch: 'Morning', fees: 1500, startDate: '2025-11-01', membershipStartDate: '2026-07-01',
    nextDueDate: '2026-08-01', status: 'expired', pendingAmount: 0, internalNotes: 'Prefers morning slot',
    paymentHistory: [
      { id: 'p6', date: '2025-11-01', amount: 1500, remainingAmount: 0, paymentType: 'full', monthsCovered: 1, paymentMethod: 'upi', status: 'active', note: '' },
      { id: 'p7', date: '2026-07-01', amount: 1500, remainingAmount: 0, paymentType: 'full', monthsCovered: 1, paymentMethod: 'other', status: 'active', note: '' }
    ]
  },
  {
    id: 's4', name: 'Diya Kumar', phone: '9876543216', alternatePhone: '', guardianName: 'Priya Das',
    membershipTypeId: 'monthly', currentBatch: 'Evening', fees: 1500, startDate: '2025-11-15', membershipStartDate: '2026-07-15',
    nextDueDate: '2026-08-15', status: 'expired', pendingAmount: 0, internalNotes: 'Sibling of Aryan Das same guardian phone',
    paymentHistory: [
      { id: 'p8', date: '2025-11-15', amount: 1500, remainingAmount: 0, paymentType: 'full', monthsCovered: 1, paymentMethod: 'upi', status: 'active', note: '' },
      { id: 'p9', date: '2026-07-15', amount: 1500, remainingAmount: 0, paymentType: 'full', monthsCovered: 1, paymentMethod: 'upi', status: 'active', note: '' }
    ]
  },
  {
    id: 's5', name: 'Aarav Sharma', phone: '9876543210', alternatePhone: '9876543211', guardianName: 'Vikram Sharma',
    membershipTypeId: 'monthly', currentBatch: 'Morning', fees: 1500, startDate: '2026-03-01', membershipStartDate: '2026-08-01',
    nextDueDate: '2026-09-01', status: 'active', pendingAmount: 0, internalNotes: '',
    paymentHistory: [
      { id: 'p10', date: '2026-03-01', amount: 1500, remainingAmount: 0, paymentType: 'full', monthsCovered: 1, paymentMethod: 'upi', status: 'active', note: '' },
      { id: 'p11', date: '2026-04-01', amount: 3000, remainingAmount: 0, paymentType: 'advance', monthsCovered: 2, paymentMethod: 'card', status: 'active', note: 'Paid via UPI receipt shared on WhatsApp' },
      { id: 'p12', date: '2026-08-01', amount: 1500, remainingAmount: 0, paymentType: 'full', monthsCovered: 1, paymentMethod: 'upi', status: 'active', note: '' }
    ]
  },
  {
    id: 's6', name: 'Arjun Mehta', phone: '9876543218', alternatePhone: '', guardianName: 'Suresh Mehta',
    membershipTypeId: 'monthly', currentBatch: 'Morning', fees: 1500, startDate: '2026-04-10', membershipStartDate: '2026-08-10',
    nextDueDate: '2026-09-10', status: 'active', pendingAmount: 500, internalNotes: 'Partial payment pending',
    paymentHistory: [
      { id: 'p13', date: '2026-04-10', amount: 1500, remainingAmount: 0, paymentType: 'full', monthsCovered: 1, paymentMethod: 'cash', status: 'active', note: '' },
      { id: 'p14', date: '2026-08-10', amount: 1000, remainingAmount: 500, paymentType: 'partial', monthsCovered: 1, paymentMethod: 'cash', status: 'active', note: '' }
    ]
  },
  {
    id: 's7', name: 'Ananya Reddy', phone: '9876543213', alternatePhone: '', guardianName: 'Lakshmi Reddy',
    membershipTypeId: 'monthly', currentBatch: 'Evening', fees: 1500, startDate: '2026-02-15', membershipStartDate: '2026-08-15',
    nextDueDate: '2026-09-15', status: 'active', pendingAmount: 0, internalNotes: '',
    paymentHistory: [
      { id: 'p15', date: '2026-02-15', amount: 1500, remainingAmount: 0, paymentType: 'full', monthsCovered: 1, paymentMethod: 'upi', status: 'active', note: '' },
      { id: 'p16', date: '2026-08-15', amount: 1500, remainingAmount: 0, paymentType: 'full', monthsCovered: 1, paymentMethod: 'upi', status: 'active', note: '' }
    ]
  },
  {
    id: 's8', name: 'Vivaan Gupta', phone: '9876543211', alternatePhone: '', guardianName: 'Anil Gupta',
    membershipTypeId: 'quarterly', currentBatch: 'Evening', fees: 4000, startDate: '2026-01-01', membershipStartDate: '2026-07-01',
    nextDueDate: '2026-10-01', status: 'active', pendingAmount: 0, internalNotes: '',
    paymentHistory: [
      { id: 'p17', date: '2026-01-01', amount: 4000, remainingAmount: 0, paymentType: 'full', monthsCovered: 3, paymentMethod: 'cash', status: 'active', note: '' },
      { id: 'p18', date: '2026-07-01', amount: 4000, remainingAmount: 0, paymentType: 'full', monthsCovered: 3, paymentMethod: 'cash', status: 'active', note: '' }
    ]
  },
  {
    id: 's9', name: 'Nisha Verma', phone: '9876543219', alternatePhone: '', guardianName: 'Meena Verma',
    membershipTypeId: 'monthly', currentBatch: 'Evening', fees: 1500, startDate: '2026-03-05', membershipStartDate: '2026-08-05',
    nextDueDate: '2026-11-05', status: 'active', pendingAmount: 0, internalNotes: '',
    paymentHistory: [
      { id: 'p19', date: '2026-03-05', amount: 1500, remainingAmount: 0, paymentType: 'full', monthsCovered: 1, paymentMethod: 'upi', status: 'active', note: '' },
      { id: 'p20', date: '2026-08-05', amount: 4500, remainingAmount: 0, paymentType: 'advance', monthsCovered: 3, paymentMethod: 'upi', status: 'active', note: '' }
    ]
  },
  {
    id: 's10', name: 'Riya Patel', phone: '9876543212', alternatePhone: '', guardianName: 'Rajesh Patel',
    membershipTypeId: 'annual', currentBatch: 'Morning', fees: 14000, startDate: '2026-01-15', membershipStartDate: '2026-01-15',
    nextDueDate: '2027-01-15', status: 'active', pendingAmount: 0, internalNotes: 'Annual plan next due Jan 2027',
    paymentHistory: [
      { id: 'p21', date: '2026-01-15', amount: 14000, remainingAmount: 0, paymentType: 'full', monthsCovered: 12, paymentMethod: 'upi', status: 'active', note: '' }
    ]
  },
  {
    id: 's11', name: 'Zara Khan', phone: '9876543220', alternatePhone: '9876543221', guardianName: 'Imran Khan',
    membershipTypeId: 'monthly', currentBatch: 'Morning', fees: 1200, startDate: '2025-08-01', membershipStartDate: '2026-05-01',
    nextDueDate: '2026-06-01', status: 'off-court', pendingAmount: 0, internalNotes: 'Took a break may rejoin',
    paymentHistory: [
      { id: 'p22', date: '2025-08-01', amount: 1200, remainingAmount: 0, paymentType: 'full', monthsCovered: 1, paymentMethod: 'card', status: 'inactive', note: '' },
      { id: 'p23', date: '2026-05-01', amount: 1200, remainingAmount: 0, paymentType: 'full', monthsCovered: 1, paymentMethod: 'upi', status: 'inactive', note: '' }
    ]
  },
  {
    id: 's12', name: 'Dev Nair', phone: '9876543222', alternatePhone: '', guardianName: 'Sanjay Nair',
    membershipTypeId: 'monthly', currentBatch: 'Evening', fees: 1500, startDate: '2025-06-01', membershipStartDate: '2026-04-01',
    nextDueDate: '2026-05-01', status: 'off-court', pendingAmount: 1500, internalNotes: 'Has outstanding dues before leaving',
    paymentHistory: [
      { id: 'p24', date: '2025-06-01', amount: 1500, remainingAmount: 0, paymentType: 'full', monthsCovered: 1, paymentMethod: 'upi', status: 'inactive', note: '' },
      { id: 'p25', date: '2026-04-01', amount: 1500, remainingAmount: 0, paymentType: 'full', monthsCovered: 1, paymentMethod: 'upi', status: 'deleted', note: '' }
    ]
  }
]
