import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { SESSION_COOKIE, SESSION_DAYS } from '@/lib/auth'

async function validateInviteCode(db: any, code: string, userId?: string): Promise<string | null> {
  // 1. Check static env var (master code, unlimited)
  const masterCode = process.env.INVITE_CODE
  if (masterCode && code.trim() === masterCode.trim()) return null // null = no error

  // 2. Check DB single-use codes
  const { data } = await db.from('invite_codes')
    .select('id, used').eq('code', code.toUpperCase().trim()).maybeSingle()
  if (!data) return 'Código de invitación inválido.'
  if (data.used) return 'Este código ya fue usado.'

  // Mark as used
  if (userId) {
    await db.from('invite_codes').update({
      used: true, used_by: userId, used_at: new Date().toISOString()
    }).eq('id', data.id)
  }
  return null
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { username, pin, mode, inviteCode } = body as {
    username: string; pin: string; mode: 'login' | 'register'; inviteCode?: string
  }

  if (!username?.trim() || !pin || !/^\d{4,6}$/.test(pin)) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  }

  const db = createServerClient()

  if (mode === 'register') {
    // Validate invite code before creating user
    const hasInviteSystem = process.env.INVITE_CODE || true // always require code if table has entries
    if (inviteCode !== undefined) {
      const codeError = await validateInviteCode(db, inviteCode || '')
      if (codeError) return NextResponse.json({ error: codeError }, { status: 403 })
    }

    const { data: existing } = await db.from('users').select('id').eq('username', username.trim()).maybeSingle()
    if (existing) return NextResponse.json({ error: 'Ese apodo ya está en uso.' }, { status: 409 })

    // Fair play: 1 punto por partido finalizado
    const { count } = await db.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'finished')
    const pointsBase = count ?? 0

    const { data: pinHash } = await db.rpc('hash_pin', { plain_pin: pin })
    const { data: user, error } = await db
      .from('users')
      .insert({ username: username.trim(), pin_hash: pinHash, points_base: pointsBase })
      .select().single()
    if (error || !user) return NextResponse.json({ error: 'Error al registrar.' }, { status: 500 })

    // Mark invite code as used now that we have the user id
    if (inviteCode) await validateInviteCode(db, inviteCode, user.id)

    const { data: session } = await db.from('sessions').insert({ user_id: user.id }).select('token').single()
    if (!session) return NextResponse.json({ error: 'Error de sesión.' }, { status: 500 })
    return buildResponse(session.token)
  }

  // LOGIN
  const { data: user } = await db.from('users')
    .select('id, pin_hash, is_banned').eq('username', username.trim()).maybeSingle()
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })
  if (user.is_banned) return NextResponse.json({ error: 'Tu cuenta ha sido suspendida. Contacta al organizador.' }, { status: 403 })

  const { data: valid } = await db.rpc('verify_pin', { plain_pin: pin, hashed_pin: user.pin_hash })
  if (!valid) return NextResponse.json({ error: 'PIN incorrecto.' }, { status: 401 })

  await db.from('sessions').delete().eq('user_id', user.id).lt('expires_at', new Date().toISOString())
  const { data: session } = await db.from('sessions').insert({ user_id: user.id }).select('token').single()
  if (!session) return NextResponse.json({ error: 'Error de sesión.' }, { status: 500 })
  return buildResponse(session.token)
}

function buildResponse(token: string) {
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
