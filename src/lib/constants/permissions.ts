import type { ModulePermission } from '../types/settings'

// Display reference only; authorization remains in server actions and Supabase RLS.
export const PERMISSION_MATRIX: ModulePermission[] = [
  { module: 'Dashboard',        owner: 'full',    manager: 'full',    coach: 'view',    accountant: 'view',    receptionist: 'view'    },
  { module: 'Students',         owner: 'full',    manager: 'full',    coach: 'view',    accountant: 'view',    receptionist: 'partial' },
  { module: 'Batches',          owner: 'full',    manager: 'full',    coach: 'view',    accountant: 'none',    receptionist: 'none'    },
  { module: 'Attendance',       owner: 'full',    manager: 'full',    coach: 'mark',    accountant: 'none',    receptionist: 'none'    },
  { module: 'Fee Transactions', owner: 'full',    manager: 'full',    coach: 'none',    accountant: 'full',    receptionist: 'collect' },
  { module: 'Accounts',         owner: 'full',    manager: 'view',    coach: 'none',    accountant: 'full',    receptionist: 'none'    },
  { module: 'Inventory',        owner: 'full',    manager: 'full',    coach: 'none',    accountant: 'view',    receptionist: 'none'    },
  { module: 'Court Memberships',    owner: 'full',    manager: 'full',    coach: 'none',    accountant: 'view',    receptionist: 'collect' },
  { module: 'Events',           owner: 'full',    manager: 'full',    coach: 'view',    accountant: 'none',    receptionist: 'view'    },
  { module: 'Settings',         owner: 'full',    manager: 'partial', coach: 'none',    accountant: 'none',    receptionist: 'none'    },
  { module: 'Staff Management', owner: 'full',    manager: 'view',    coach: 'none',    accountant: 'none',    receptionist: 'none'    },
]
