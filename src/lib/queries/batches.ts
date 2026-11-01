import { getServerSession } from '@/lib/supabase/auth-context'
import type { Batch } from '@/lib/mock-data'

export async function getBatches(): Promise<Batch[]> {
  const { supabase } = await getServerSession()
  const { data, error } = await supabase
    .from('batches')
    .select('id, name, description, days, fees, branch_id, is_active')
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('Error fetching batches:', error.message)
    return []
  }

  return (data ?? []).map(row => ({
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    days: (row.days ?? []) as string[],
    fees: row.fees !== null && row.fees !== undefined ? row.fees : undefined,
    branchId: row.branch_id ?? '',
  }))
}

export async function getBatchById(id: string): Promise<Batch | null> {
  const { supabase } = await getServerSession()
  const { data, error } = await supabase
    .from('batches')
    .select('id, name, description, days, fees, branch_id, is_active')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null

  return {
    id: data.id,
    name: data.name,
    description: data.description ?? undefined,
    days: (data.days ?? []) as string[],
    fees: data.fees !== null && data.fees !== undefined ? data.fees : undefined,
    branchId: data.branch_id ?? '',
  }
}
