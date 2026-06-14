import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getSessionUser } from '@/lib/auth'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function GET() {
  const user = await getSessionUser()
  if (!user?.is_admin) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  const db = createServerClient()
  const { data } = await db.from('invite_codes')
    .select('id, code, used, used_at, created_at, used_by_user:users!invite_codes_used_by_fkey(username)')
    .order('created_at', { ascending: false })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user?.is_admin) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const customCode = body.code?.toUpperCase().trim()

  const db = createServerClient()
  const code = customCode || generateCode()

  const { data, error } = await db.from('invite_codes')
    .insert({ code, created_by: user.id })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser()
  if (!user?.is_admin) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  const { id } = await req.json()
  const db = createServerClient()
  await db.from('invite_codes').delete().eq('id', id).eq('used', false)
  return NextResponse.json({ ok: true })
}
