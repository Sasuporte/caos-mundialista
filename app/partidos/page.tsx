import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import PartidosClient from '@/components/PartidosClient'

export default async function PartidosPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  return <PartidosClient currentUser={user!} />
}
