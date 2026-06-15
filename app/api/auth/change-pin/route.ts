import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getSessionUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { currentPin, newPin } = await req.json()
  if (!/^\d{4,6}$/.test(newPin)) return NextResponse.json({ error: 'El nuevo PIN debe tener 4-6 dígitos.' }, { status: 400 })
  if (currentPin === newPin) return NextResponse.json({ error: 'El nuevo PIN debe ser diferente.' }, { status: 400 })

  const db = createServerClient()
  const { data: userData } = await db.from('users').select('pin_hash').eq('id', user.id).single()
  if (!userData) return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })

  const { data: valid } = await db.rpc('verify_pin', { plain_pin: currentPin, hashed_pin: userData.pin_hash })
  if (!valid) return NextResponse.json({ error: 'PIN actual incorrecto.' }, { status: 401 })

  const { data: newHash } = await db.rpc('hash_pin', { plain_pin: newPin })
  await db.from('users').update({ pin_hash: newHash }).eq('id', user.id)

  return NextResponse.json({ ok: true })
}
