import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { unstable_noStore as noStore } from 'next/cache'
export const dynamic = 'force-dynamic'
export async function GET() {
  noStore()
  const timestamp = Date.now()
  const db = createServerClient()
  const { count: predCount } = await db.from('predictions').select('*', { count: 'exact', head: true })
  const { data: users } = await db.from('users').select('username, points_base')
  return NextResponse.json({
    timestamp,
    predictions_count: predCount,
    users,
  }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } })
}
