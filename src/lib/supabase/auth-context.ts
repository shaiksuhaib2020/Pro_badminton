import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function readServerSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: staff } = await supabase
    .from('staff_members')
    .select('academy_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!staff) return null

  return {
    supabase,
    user,
    academyId: staff.academy_id as string,
    role: staff.role as string,
  }
}

export async function getServerSession() {
  const session = await readServerSession()
  if (!session) redirect('/login')
  return session
}
