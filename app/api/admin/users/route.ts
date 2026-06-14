import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getSessionUser } from '@/lib/auth'

export async function GET() {
  const user = await getSessionUser()
  if (!user?.is_admin) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  const db = createServerClient()
  const { data } = await db.from('users')
    .select('id, username, is_admin, is_banned, points_base, created_at')
    .order('created_at', { ascending: true })
  return NextResponse.json(data ?? [])
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser()
  if (!user?.is_admin) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  const { id, is_banned } = await req.json()
  if (id === user.id) return NextResponse.json({ error: 'No puedes banearte a ti mismo.' }, { status: 400 })
  const db = createServerClient()
  const { data, error } = await db.from('users').update({ is_banned }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Revoke all sessions if banning
  if (is_banned) await db.from('sessions').delete().eq('user_id', id)
  return NextResponse.json(data)
}
