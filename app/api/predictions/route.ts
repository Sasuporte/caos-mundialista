import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getSessionUser } from '@/lib/auth'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const db = createServerClient()
  const { data } = await db.from('predictions').select('*').eq('user_id', user.id)
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { match_id, home_score, away_score, is_joker } = await req.json()

  const db = createServerClient()

  // Check lockout: 15 min before kick off
  const { data: match } = await db.from('matches').select('kick_off_time, status').eq('id', match_id).single()
  if (!match) return NextResponse.json({ error: 'Partido no encontrado.' }, { status: 404 })
  if (match.status === 'finished') return NextResponse.json({ error: 'Partido ya finalizó.' }, { status: 409 })

  const lockoutMs = new Date(match.kick_off_time).getTime() - 15 * 60 * 1000
  if (Date.now() >= lockoutMs) return NextResponse.json({ error: 'Predicciones bloqueadas (< 15 min).' }, { status: 403 })

  // If setting joker, remove from any other match in same matchday first
  if (is_joker) {
    const { data: matchData } = await db.from('matches').select('matchday').eq('id', match_id).single()
    if (matchData) {
      const { data: sameDay } = await db.from('matches').select('id').eq('matchday', matchData.matchday)
      const ids = (sameDay ?? []).map((m: any) => m.id)
      await db.from('predictions').update({ is_joker: false }).eq('user_id', user.id).in('match_id', ids)
    }
  }

  const { data, error } = await db.from('predictions')
    .upsert({ user_id: user.id, match_id, home_score, away_score, is_joker: is_joker ?? false },
      { onConflict: 'user_id,match_id' })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
