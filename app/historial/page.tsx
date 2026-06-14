import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import HistorialClient from '@/components/HistorialClient'

export default async function HistorialPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  return <HistorialClient currentUser={user!} />
}
