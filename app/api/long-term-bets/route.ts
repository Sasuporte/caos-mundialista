import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getSessionUser } from '@/lib/auth'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const db = createServerClient()
  const { data } = await db.from('long_term_bets').select('*').eq('user_id', user.id).maybeSingle()
  return NextResponse.json(data ?? null)
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const db = createServerClient()
  const { data: anyMatch } = await db.from('matches')
    .select('kick_off_time').order('kick_off_time').limit(1).single()

  if (anyMatch) {
    const lockoutMs = new Date(anyMatch.kick_off_time).getTime() - 15 * 60 * 1000
    if (Date.now() >= lockoutMs) {
      return NextResponse.json({ error: 'Las apuestas de largo plazo están bloqueadas.' }, { status: 403 })
    }
  }

  const body = await req.json()
  const fields = ['champion', 'runner_up', 'third_place', 'top_scorer', 'revelation_team', 'disappointment_team']
  const payload: Record<string, any> = { user_id: user.id }
  fields.forEach(f => { if (body[f] !== undefined) payload[f] = body[f] })

  const { data, error } = await db.from('long_term_bets')
    .upsert(payload, { onConflict: 'user_id' }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
