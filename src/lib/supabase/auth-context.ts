import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function getServerSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: staff } = await supabase
    .from('staff_members')
    .select('academy_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!staff) redirect('/login')

  return {
    supabase,
    user,
    academyId: staff.academy_id as string,
    role: staff.role as string,
  }
}
