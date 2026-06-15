import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getSessionUser } from '@/lib/auth'

export async function GET() {
  const user = await getSessionUser()
  if (!user?.is_admin) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  const db = createServerClient()
  const { data } = await db.from('long_term_results').select('bonus_open').maybeSingle()
  return NextResponse.json({ bonus_open: data?.bonus_open ?? false })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user?.is_admin) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const { bonus_open } = await req.json()
  const db = createServerClient()

  const { data: existing } = await db.from('long_term_results').select('id').maybeSingle()

  if (existing?.id) {
    await db.from('long_term_results').update({ bonus_open }).eq('id', existing.id)
  } else {
    await db.from('long_term_results').insert({ bonus_open, finalized: false })
  }

  return NextResponse.json({ ok: true, bonus_open })
}
