import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase-server'
import { SESSION_COOKIE } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (token) {
    const db = createServerClient()
    await db.from('sessions').delete().eq('token', token)
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(SESSION_COOKIE)
  return res
}
