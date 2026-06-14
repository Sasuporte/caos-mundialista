import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import BonusClient from '@/components/BonusClient'

export default async function BonusPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  return <BonusClient currentUser={user!} />
}
