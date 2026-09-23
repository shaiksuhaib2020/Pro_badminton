import { format, subDays, addDays } from 'date-fns'
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
  status: 'active' | 'due-soon' | 'expired' | 'inactive' | 'dropout'
  pendingAmount: number
  internalNotes: string
  paymentHistory: PaymentEntry[]
}


export type CourtPlan = {
  id: string
  name: string
  planType: 'monthly' | 'sessions'
  price: number
  // Monthly-specific
  durationMonths?: number         // how many months the plan covers
  // Sessions-specific
  totalSessions?: number          // sessions in this pack
  validityDays?: number           // days before unused sessions expire
}

export type CourtPaymentEntry = {
  id: string
  date: string
  amount: number
  paymentMethod: 'cash' | 'upi' | 'card' | 'other'
  entryType: 'new' | 'renewal' | 'session-topup'
  status: 'active' | 'deleted'
  note?: string
}

export type CourtMember = {
  id: string
  name: string
  phone: string
  planId?: string
  durationMonths?: number
  planType: 'monthly' | 'sessions'
  joiningDate: string
  // Monthly
  membershipStartDate?: string
  nextDueDate?: string
  // Sessions
  totalSessions?: number
  remainingSessions?: number
  // Shared
  status: 'active' | 'due-soon' | 'expired' | 'sessions-low' | 'exhausted' | 'inactive' | 'dropout'
  amountPaid: number
  pendingAmount?: number
  notes?: string
  paymentHistory: CourtPaymentEntry[]
  checkInHistory: Array<{ id: string; date: string; sessionsAfter: number }>
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

export type StaffRole = 'owner' | 'manager' | 'coach' | 'accountant' | 'receptionist'
export type StaffStatus = 'active' | 'invited' | 'suspended'
export type AccessLevel = 'full' | 'view' | 'collect' | 'mark' | 'partial' | 'none'

export interface Branch {
  id: string
  name: string
  address: string
  phone: string
  isActive: boolean
  isPrimary: boolean
  createdAt: string
}

export interface StaffMember {
  id: string
  name: string
  email: string
  role: StaffRole
  branchIds: string[]
  status: StaffStatus
  invitedAt: string
  avatarInitials: string
}

export interface ModulePermission {
  module: string
  owner: AccessLevel
  manager: AccessLevel
  coach: AccessLevel
  accountant: AccessLevel
  receptionist: AccessLevel
}

export type Settings = {
  courtMembershipEnabled: boolean
  courtPlans: CourtPlan[]
  courtName: string
  tenantPhone?: string
  tenantAddress?: string
  tenantTimezone?: string
  multiBranchEnabled: boolean
  branches: Branch[]
  staffMembers: StaffMember[]
  membershipTypes: MembershipType[]
  batches: string[]
}

export interface Batch {
  id: string
  name: string
  branchId: string
  days: string[]
  fees?: number
  description?: string
}

export type AttendanceRecord = {
  id: string
  batchId: string
  date: string           // yyyy-MM-dd
  records: Record<string, 'present' | 'absent'>  // studentId → status
}

export let mockBatches: Batch[] = [
  {
    id: 'batch-morning',
    name: 'Morning',
    branchId: 'branch-1',
    days: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
    fees: 1500,
    description: '6:00 AM – 8:00 AM',
  },
  {
    id: 'batch-evening',
    name: 'Evening',
    branchId: 'branch-1',
    days: ['Monday','Wednesday','Friday','Saturday'],
    fees: 1500,
    description: '5:00 PM – 7:00 PM',
  },
]

export let mockBranches: Branch[] = [
  {
    id: 'branch-1',
    name: 'Main Center',
    address: 'Gachibowli, Hyderabad',
    phone: '9876500001',
    isActive: true,
    isPrimary: true,
    createdAt: '2024-01-15',
  },
  {
    id: 'branch-2',
    name: 'Kondapur Center',
    address: 'Kondapur, Hyderabad',
    phone: '9876500002',
    isActive: true,
    isPrimary: false,
    createdAt: '2024-06-01',
  },
]

export let mockStaffMembers: StaffMember[] = [
  {
    id: 'staff-1',
    name: 'Ravi Kumar',
    email: 'ravi@probadminton.in',
    role: 'owner',
    branchIds: ['all'],
    status: 'active',
    invitedAt: '2024-01-15',
    avatarInitials: 'RK',
  },
  {
    id: 'staff-2',
    name: 'Anita Sharma',
    email: 'anita@probadminton.in',
    role: 'coach',
    branchIds: ['branch-1'],
    status: 'active',
    invitedAt: '2024-03-10',
    avatarInitials: 'AS',
  },
  {
    id: 'staff-3',
    name: 'Deepak Nair',
    email: 'deepak@probadminton.in',
    role: 'accountant',
    branchIds: ['branch-1', 'branch-2'],
    status: 'invited',
    invitedAt: '2026-09-15',
    avatarInitials: 'DN',
  },
]

export const PERMISSION_MATRIX: ModulePermission[] = [
  { module: 'Dashboard',        owner: 'full',    manager: 'full',    coach: 'view',    accountant: 'view',    receptionist: 'view'    },
  { module: 'Students',         owner: 'full',    manager: 'full',    coach: 'view',    accountant: 'view',    receptionist: 'partial' },
  { module: 'Batches',          owner: 'full',    manager: 'full',    coach: 'view',    accountant: 'none',    receptionist: 'none'    },
  { module: 'Attendance',       owner: 'full',    manager: 'full',    coach: 'mark',    accountant: 'none',    receptionist: 'none'    },
  { module: 'Fee Transactions', owner: 'full',    manager: 'full',    coach: 'none',    accountant: 'full',    receptionist: 'collect' },
  { module: 'Accounts',         owner: 'full',    manager: 'view',    coach: 'none',    accountant: 'full',    receptionist: 'none'    },
  { module: 'Inventory',        owner: 'full',    manager: 'full',    coach: 'none',    accountant: 'view',    receptionist: 'none'    },
  { module: 'Court Members',    owner: 'full',    manager: 'full',    coach: 'none',    accountant: 'view',    receptionist: 'collect' },
  { module: 'Events',           owner: 'full',    manager: 'full',    coach: 'view',    accountant: 'none',    receptionist: 'view'    },
  { module: 'Settings',         owner: 'full',    manager: 'partial', coach: 'none',    accountant: 'none',    receptionist: 'none'    },
  { module: 'Staff Management', owner: 'full',    manager: 'view',    coach: 'none',    accountant: 'none',    receptionist: 'none'    },
]


export let mockCourtPlans: CourtPlan[] = [
  {
    id: 'cp-1',
    name: 'Monthly Unlimited',
    planType: 'monthly',
    price: 3000,
    durationMonths: 1,
  },
  {
    id: 'cp-2',
    name: 'Session Pack — 10',
    planType: 'sessions',
    price: 1500,
    totalSessions: 10,
    validityDays: 60,
  },
  {
    id: 'cp-3',
    name: 'Session Pack — 20',
    planType: 'sessions',
    price: 2500,
    totalSessions: 20,
    validityDays: 90,
  },
]

export let mockCourtMembers: CourtMember[] = [
  {
    id: 'cm-1',
    name: 'Rohit Kumar',
    phone: '9876500001',
    planId: 'cp-1',
    planType: 'monthly',
    joiningDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    membershipStartDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    nextDueDate: format(addDays(new Date(), 15), 'yyyy-MM-dd'),
    status: 'active',
    amountPaid: 3000,
    checkInHistory: [],
    paymentHistory: [
      {
        id: 'cpe-1', date: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        amount: 3000, paymentMethod: 'upi', entryType: 'new', status: 'active',
      },
    ],
  },
  {
    id: 'cm-2',
    name: 'Deepa Reddy',
    phone: '9876500002',
    planId: 'cp-2',
    planType: 'sessions',
    joiningDate: format(subDays(new Date(), 20), 'yyyy-MM-dd'),
    totalSessions: 10,
    remainingSessions: 2,
    status: 'sessions-low',
    amountPaid: 1500,
    checkInHistory: [],
    paymentHistory: [
      {
        id: 'cpe-2', date: format(subDays(new Date(), 20), 'yyyy-MM-dd'),
        amount: 1500, paymentMethod: 'cash', entryType: 'new', status: 'active',
      },
    ],
  },
  {
    id: 'cm-3',
    name: 'Kavya Singh',
    phone: '9876500003',
    planId: 'cp-3',
    planType: 'sessions',
    joiningDate: format(subDays(new Date(), 45), 'yyyy-MM-dd'),
    totalSessions: 20,
    remainingSessions: 0,
    status: 'exhausted',
    amountPaid: 2500,
    checkInHistory: [],
    paymentHistory: [
      {
        id: 'cpe-3', date: format(subDays(new Date(), 45), 'yyyy-MM-dd'),
        amount: 2500, paymentMethod: 'cash', entryType: 'new', status: 'active',
      },
    ],
  },
]

export let mockAttendance: AttendanceRecord[] = []


export let mockSettings: Settings = {
  courtMembershipEnabled: false,
  courtPlans: [],
  courtName: 'EzyFee Badminton Academy',
  tenantPhone: '+91 98765 43210',
  tenantAddress: '123 Sports Complex, Indiranagar, Bengaluru, Karnataka 560038',
  tenantTimezone: 'Asia/Kolkata (IST)',
  multiBranchEnabled: false,
  branches: [
    {
      id: 'branch-1',
      name: 'Indiranagar Center (Main)',
      address: '123 Sports Complex, Indiranagar, Bengaluru, KA 560038',
      phone: '+91 98765 43210',
      isActive: true,
      isPrimary: true,
      createdAt: '2023-01-15',
    },
    {
      id: 'branch-2',
      name: 'Whitefield Campus',
      address: '45 ITPL Main Road, Whitefield, Bengaluru, KA 560066',
      phone: '+91 98765 43211',
      isActive: true,
      isPrimary: false,
      createdAt: '2023-06-20',
    },
    {
      id: 'branch-3',
      name: 'Koramangala Indoor Court',
      address: '88 5th Block, Koramangala, Bengaluru, KA 560095',
      phone: '+91 98765 43212',
      isActive: false,
      isPrimary: false,
      createdAt: '2023-11-05',
    },
  ],
  staffMembers: [
    {
      id: 'staff-1',
      name: 'Vikram Prakash',
      email: 'vikram@probadminton.in',
      role: 'owner',
      branchIds: ['branch-1', 'branch-2', 'branch-3'],
      status: 'active',
      invitedAt: '2023-01-15T08:00:00Z',
      avatarInitials: 'VP'
    },
    {
      id: 'staff-2',
      name: 'Rajesh Sharma',
      email: 'rajesh@probadminton.in',
      role: 'manager',
      branchIds: ['branch-1'],
      status: 'active',
      invitedAt: '2023-02-01T10:30:00Z',
      avatarInitials: 'RS'
    },
    {
      id: 'staff-3',
      name: 'Anil Kumar',
      email: 'anil.coach@probadminton.in',
      role: 'coach',
      branchIds: ['branch-1'],
      status: 'active',
      invitedAt: '2023-03-10T09:15:00Z',
      avatarInitials: 'AK'
    },
    {
      id: 'staff-4',
      name: 'Priya Sundaram',
      email: 'priya.s@probadminton.in',
      role: 'manager',
      branchIds: ['branch-2'],
      status: 'invited',
      invitedAt: '2023-08-20T14:45:00Z',
      avatarInitials: 'PS'
    },
  ],
  batches: mockBatches.map(b => b.name),
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
    nextDueDate: '2026-06-01', status: 'dropout', pendingAmount: 0, internalNotes: 'Took a break may rejoin',
    paymentHistory: [
      { id: 'p22', date: '2025-08-01', amount: 1200, remainingAmount: 0, paymentType: 'full', monthsCovered: 1, paymentMethod: 'card', status: 'inactive', note: '' },
      { id: 'p23', date: '2026-05-01', amount: 1200, remainingAmount: 0, paymentType: 'full', monthsCovered: 1, paymentMethod: 'upi', status: 'inactive', note: '' }
    ]
  },
  {
    id: 's12', name: 'Dev Nair', phone: '9876543222', alternatePhone: '', guardianName: 'Sanjay Nair',
    membershipTypeId: 'monthly', currentBatch: 'Evening', fees: 1500, startDate: '2025-06-01', membershipStartDate: '2026-04-01',
    nextDueDate: '2026-05-01', status: 'dropout', pendingAmount: 1500, internalNotes: 'Has outstanding dues before leaving',
    paymentHistory: [
      { id: 'p24', date: '2025-06-01', amount: 1500, remainingAmount: 0, paymentType: 'full', monthsCovered: 1, paymentMethod: 'upi', status: 'inactive', note: '' },
      { id: 'p25', date: '2026-04-01', amount: 1500, remainingAmount: 0, paymentType: 'full', monthsCovered: 1, paymentMethod: 'upi', status: 'deleted', note: '' }
    ]
  }
]


// ── Account Manager Types ─────────────────────────────

export type AccountEntry = {
  id: string
  date: string           // yyyy-MM-dd
  category: string
  description: string
  amount: number         // always positive
  paymentMethod: 'cash' | 'upi' | 'card' | 'other'
  notes?: string
}

// ── Expense categories ───────────────────────────────
export const EXPENSE_CATEGORIES = [
  'Shuttlecocks',
  'Equipment & Gear',
  'Court Rent',
  'Coaching Staff',
  'Utilities',
  'Maintenance & Repairs',
  'Marketing',
  'Tournament Expenses',
  'Miscellaneous',
] as const

// ── Income categories (non-fee only) ─────────────────
export const INCOME_CATEGORIES = [
  'Court Rental',
  'Membership Fees',
  'Equipment Sales',
  'Shuttle Sales',
  'Racket Restringing',
  'Merchandise',
  'Sponsorship',
  'Tournament Entry',
  'Other',
]

// ── Seed data ────────────────────────────────────────
export let mockExpenses: AccountEntry[] = [
  {
    id: 'exp-1',
    date: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
    category: 'Shuttlecocks',
    description: 'Yonex Mavis 350 — 10 tubes',
    amount: 2200,
    paymentMethod: 'cash',
    notes: 'For morning batch sessions',
  },
  {
    id: 'exp-2',
    date: format(subDays(new Date(), 3), 'yyyy-MM-dd'),
    category: 'Utilities',
    description: 'Electricity bill — August',
    paymentMethod: 'cash',
    amount: 4800,
  },
  {
    id: 'exp-3',
    date: format(subDays(new Date(), 5), 'yyyy-MM-dd'),
    category: 'Court Rent',
    description: 'Monthly court rental — August',
    paymentMethod: 'cash',
    amount: 18000,
  },
  {
    id: 'exp-4',
    date: format(subDays(new Date(), 8), 'yyyy-MM-dd'),
    category: 'Equipment & Gear',
    description: 'New net + posts replacement',
    paymentMethod: 'cash',
    amount: 3500,
  },
  {
    id: 'exp-5',
    date: format(subDays(new Date(), 10), 'yyyy-MM-dd'),
    category: 'Shuttlecocks',
    description: 'Li-Ning A300 — 5 tubes',
    paymentMethod: 'cash',
    amount: 1100,
  },
  {
    id: 'exp-6',
    date: format(subDays(new Date(), 12), 'yyyy-MM-dd'),
    category: 'Coaching Staff',
    description: 'Assistant coach — part-time August',
    paymentMethod: 'cash',
    amount: 8000,
  },
]

export let mockIncomeEntries: AccountEntry[] = [
  {
    id: 'inc-1',
    date: format(subDays(new Date(), 2), 'yyyy-MM-dd'),
    category: 'Shuttle Sales',
    description: 'Sold 3 tubes to students',
    paymentMethod: 'cash',
    amount: 660,
  },
  {
    id: 'inc-2',
    date: format(subDays(new Date(), 4), 'yyyy-MM-dd'),
    category: 'Racket Restringing',
    description: 'Restringing — 4 rackets',
    paymentMethod: 'cash',
    amount: 800,
  },
  {
    id: 'inc-3',
    date: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    category: 'Equipment Sales',
    description: 'Grip tape + wristbands',
    paymentMethod: 'cash',
    amount: 350,
  },
  {
    id: 'inc-4',
    date: format(subDays(new Date(), 11), 'yyyy-MM-dd'),
    category: 'Shuttle Sales',
    description: 'Sold 5 tubes — evening batch',
    paymentMethod: 'cash',
    amount: 1100,
  },
]

// ── Inventory types & data ────────────────────────────────

export type InventoryItem = {
  id: string
  sku: string
  name: string
  category: string
  description: string
  unit: string
  quantity: number
  price: number          // unit price (purchase) in ₹
  sellingPrice: number   // selling price in ₹
  icon?: string          // product logo or icon
}

export const BUILTIN_INVENTORY_CATEGORIES = [
  'Racquet Sports',
  'Footwear',
  'Apparel',
  'Accessories / Miscellaneous',
] as const

// Mutable — user-created custom inventory categories
export let mockCustomInventoryCategories: string[] = []

// Mutable inventory items
export let mockInventoryItems: InventoryItem[] = [
  {
    id: 'inv-1',
    sku: 'YMX-350',
    name: 'Yonex Mavis 350',
    category: 'Racquet Sports',
    description: 'Feather shuttle for training — per tube',
    unit: 'tube',
    quantity: 15,
    price: 220,
    sellingPrice: 350,
  },
  {
    id: 'inv-2',
    sku: 'LNBA300',
    name: 'Li-Ning A300 Shuttlecock',
    category: 'Racquet Sports',
    description: 'Nylon shuttle — per tube',
    unit: 'tube',
    quantity: 8,
    price: 180,
    sellingPrice: 250,
  },
  {
    id: 'inv-3',
    sku: 'YAX-77',
    name: 'Yonex Astrox 77',
    category: 'Racquet Sports',
    description: 'Intermediate attacking racquet',
    unit: 'piece',
    quantity: 3,
    price: 8500,
    sellingPrice: 9500,
  },
  {
    id: 'inv-4',
    sku: 'VSH-A820',
    name: 'Victor SH-A820 Court Shoes',
    category: 'Footwear',
    description: 'Non-marking badminton court shoes',
    unit: 'pair',
    quantity: 5,
    price: 3200,
    sellingPrice: 3800,
  },
  {
    id: 'inv-5',
    sku: 'BOG-TAPE',
    name: 'Badminton Overgrip Tape',
    category: 'Accessories / Miscellaneous',
    description: 'Pack of 3 overgrips',
    unit: 'roll',
    quantity: 22,
    price: 150,
    sellingPrice: 200,
  },
  {
    id: 'inv-6',
    sku: 'DF-TSHIRT',
    name: 'Dry-Fit Sports T-Shirt',
    category: 'Apparel',
    description: 'Academy jersey — moisture wicking',
    unit: 'piece',
    quantity: 12,
    price: 450,
    sellingPrice: 650,
  },
]

// ── Custom expense categories (user-created) ──────────────
// Mutable — appended by user in the Expenses panel
export let mockCustomExpenseCategories: string[] = []


// Self-executing seed function at module level
;(() => {
  const eligible = (batchName: string) =>
    mockStudents.filter(s => s.status !== 'dropout' && s.currentBatch === batchName)
  
  for (let i = 1; i <= 7; i++) {
    const date = format(subDays(new Date(), i), 'yyyy-MM-dd')
    mockBatches.forEach(batch => {
      const records: Record<string, 'present' | 'absent'> = {}
      eligible(batch.name).forEach(s => {
        records[s.id] = Math.random() > 0.15 ? 'present' : 'absent'
      })
      mockAttendance.push({
        id: `${batch.id}-${date}`,
        batchId: batch.id,
        date,
        records,
      })
    })
  }
})()
