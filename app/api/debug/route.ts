import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const build = {
    timestamp: new Date().toISOString(),
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'NO DEFINIDA',
    service_key_prefix: process.env.SUPABASE_SERVICE_ROLE_KEY
      ? process.env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 20) + '...'
      : 'NO DEFINIDA',
    anon_key_prefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(0, 20) + '...'
      : 'NO DEFINIDA',
    app_url: process.env.NEXT_PUBLIC_APP_URL ?? 'NO DEFINIDA',
    node_env: process.env.NODE_ENV,
  }

  let db_result: any = null
  let db_error: any = null

  try {
    const db = createServerClient()
    const { data, error } = await db
      .from('users')
      .select('id, username, points_base, created_at')
      .order('created_at')

    if (error) {
      db_error = { message: error.message, code: error.code, hint: error.hint }
    } else {
      db_result = {
        count: data?.length ?? 0,
        users: data?.map((u: any) => ({
          username: u.username,
          points_base: u.points_base,
        })),
      }
    }
  } catch (e: any) {
    db_error = { message: e.message, stack: e.stack }
  }

  return NextResponse.json({ build, database: { result: db_result, error: db_error } })
}
