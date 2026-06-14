import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import RankingClient from '@/components/RankingClient'

export default async function RankingPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  return <RankingClient currentUser={user!} />
}
