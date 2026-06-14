import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminClient from '@/components/AdminClient'

export default async function AdminPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (!user.is_admin) redirect('/partidos')
  return <AdminClient currentUser={user!} />
}
