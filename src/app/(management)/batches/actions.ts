'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from '@/lib/supabase/auth-context'
import { getBatches } from '@/lib/queries/batches'
import type { Batch } from '@/lib/types/batches'

function batchFeePaise(fee: number | undefined): number | null {
  if (fee === undefined || fee === null) return null
  const value = fee * 100
  if (!Number.isFinite(fee) || fee < 0 || value > 2147483647 || Math.abs(Math.round(value) - value) > 0.000001) {
    throw new Error('Enter a valid batch fee with at most two decimal places')
  }
  return Math.round(value)
}

export async function getBatchesAction(): Promise<Batch[]> {
  return getBatches()
}

export async function createBatch(data: {
  name: string
  days: string[]
  fees?: number
  description?: string
  branchId?: string
}) {
  const { supabase, academyId } = await getServerSession()
  const trimmedName = data.name.trim()

  if (!trimmedName) {
    throw new Error('Batch name is required.')
  }
  if (!data.days || data.days.length === 0) {
    throw new Error('Select at least one day.')
  }

  // Check duplicate batch name within academy
  const { data: existing } = await supabase
    .from('batches')
    .select('id')
    .eq('academy_id', academyId)
    .ilike('name', trimmedName)
    .eq('is_active', true)
    .maybeSingle()

  if (existing) {
    throw new Error('A batch with this name already exists.')
  }

  const { data: batch, error } = await supabase
    .from('batches')
    .insert({
      academy_id: academyId,
      name: trimmedName,
      days: data.days as any,
      fees: batchFeePaise(data.fees),
      description: data.description?.trim() || null,
      branch_id: data.branchId || null,
      is_active: true,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/batches')
  revalidatePath('/dashboard')
  revalidatePath('/students')
  return { id: batch.id }
}

export async function updateBatch(
  id: string,
  data: {
    name: string
    days: string[]
    fees?: number
    description?: string
  }
) {
  const { supabase, academyId } = await getServerSession()
  const trimmedName = data.name.trim()

  if (!trimmedName) {
    throw new Error('Batch name is required.')
  }
  if (!data.days || data.days.length === 0) {
    throw new Error('Select at least one day.')
  }

  // Check duplicate excluding self
  const { data: existing } = await supabase
    .from('batches')
    .select('id')
    .eq('academy_id', academyId)
    .ilike('name', trimmedName)
    .neq('id', id)
    .eq('is_active', true)
    .maybeSingle()

  if (existing) {
    throw new Error('A batch with this name already exists.')
  }

  const { error } = await supabase
    .from('batches')
    .update({
      name: trimmedName,
      days: data.days as any,
      fees: batchFeePaise(data.fees),
      description: data.description?.trim() || null,
    })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/batches')
  revalidatePath('/dashboard')
  revalidatePath(`/batches/${id}`)
  revalidatePath('/students')
  return { success: true }
}

export async function deleteBatch(id: string) {
  const { supabase } = await getServerSession()

  // Check if active students are assigned to this batch
  const { count, error: countErr } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('batch_id', id)
    .neq('status', 'dropout')

  if (!countErr && (count ?? 0) > 0) {
    throw new Error(`Cannot delete — ${count} student(s) are assigned to this batch.`)
  }

  const { error } = await supabase
    .from('batches')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/batches')
  revalidatePath('/dashboard')
  revalidatePath('/students')
  return { success: true }
}
