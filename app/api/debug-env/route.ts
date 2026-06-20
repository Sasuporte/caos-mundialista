import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
export const dynamic = 'force-dynamic'
export async function GET() {
  const env = {
    url_baked: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'NO DEFINIDA',
    service_key_prefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 30) ?? 'NO DEFINIDA',
  }
  const db = createServerClient()
  const { data: users, error: uErr } = await db.from('users').select('username, points_base')
  const { data: preds, error: pErr } = await db.from('predictions').select('id', { count: 'exact', head: true })
  return NextResponse.json({ env, users, predictions_count: preds, u_error: uErr?.message, p_error: pErr?.message })
}
