import 'server-only'

import { getServerSession } from '@/lib/supabase/auth-context'
import type { Database } from '@/lib/supabase/database.types'
import type { AccountEntry } from '@/lib/types/accounts'
import { readAllPages } from './read-all-pages'

function toAccountEntry(row: Database['public']['Tables']['account_entries']['Row']): AccountEntry {
  return {
    id: row.id,
    date: row.date,
    category: row.category,
    description: row.description,
    amount: row.amount / 100,
    paymentMethod: (row.payment_method ?? undefined) as AccountEntry['paymentMethod'],
    vendor: row.vendor ?? undefined,
    notes: row.notes ?? undefined,
  }
}

export async function getExpenses(): Promise<AccountEntry[]> {
  const { supabase, academyId } = await getServerSession()

  const rows = await readAllPages((from, to) => supabase
    .from('account_entries')
    .select('*')
    .eq('academy_id', academyId)
    .eq('entry_type', 'expense')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id')
    .range(from, to))

  return rows.map(toAccountEntry)
}

export async function getCustomExpenseCategories(): Promise<string[]> {
  const { supabase, academyId } = await getServerSession()

  const { data, error } = await supabase
    .from('custom_expense_categories')
    .select('id, name')
    .eq('academy_id', academyId)
    .order('name', { ascending: true })

  if (error) {
    // If the table is empty or error occurs, fallback gracefully
    console.error('Error fetching custom expense categories:', error.message)
    return []
  }

  return (data ?? []).map(row => row.name)
}
