import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
export const dynamic = 'force-dynamic'
export async function GET() {
  const db = createServerClient()
  const { data: users } = await db.from('users').select('username, points_base')
  const { count: predCount } = await db.from('predictions').select('*', { count: 'exact', head: true })
  const { data: samplePreds } = await db.from('predictions').select('id, user_id, match_id').limit(3)
  return NextResponse.json({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    users,
    predictions_count: predCount,
    sample_predictions: samplePreds,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
