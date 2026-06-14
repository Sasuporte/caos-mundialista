import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { SESSION_COOKIE, SESSION_DAYS } from '@/lib/auth'
import { computeInitialBalance } from '@/lib/scoring'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { username, pin, mode } = body as { username: string; pin: string; mode: 'login' | 'register' }

  if (!username?.trim() || !pin || !/^\d{4,6}$/.test(pin)) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  }

  const db = createServerClient()

  if (mode === 'register') {
    const { data: existing } = await db.from('users').select('id').eq('username', username.trim()).maybeSingle()
    if (existing) return NextResponse.json({ error: 'Ese apodo ya está en uso.' }, { status: 409 })

    const { data: pinHash } = await db.rpc('hash_pin', { plain_pin: pin })

    const { data: user, error } = await db
      .from('users').insert({ username: username.trim(), pin_hash: pinHash }).select().single()
    if (error || !user) return NextResponse.json({ error: 'Error al registrar.' }, { status: 500 })

    const { data: session } = await db
      .from('sessions').insert({ user_id: user.id }).select('token').single()
    if (!session) return NextResponse.json({ error: 'Error de sesión.' }, { status: 500 })

    return buildSessionResponse(session.token)
  }

  // LOGIN
  const { data: user } = await db.from('users')
    .select('id, username, is_admin, avatar_color, pin_hash')
    .eq('username', username.trim()).maybeSingle()

  if (!user) return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })

  const { data: valid } = await db.rpc('verify_pin', { plain_pin: pin, hashed_pin: user.pin_hash })
  if (!valid) return NextResponse.json({ error: 'PIN incorrecto.' }, { status: 401 })

  // Refresh or create session
  await db.from('sessions').delete().eq('user_id', user.id).lt('expires_at', new Date().toISOString())
  const { data: session } = await db
    .from('sessions').insert({ user_id: user.id }).select('token').single()
  if (!session) return NextResponse.json({ error: 'Error de sesión.' }, { status: 500 })

  return buildSessionResponse(session.token)
}

function buildSessionResponse(token: string) {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: '/',
  })
  return res
}
