import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getSessionUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json(null)
  const db = createServerClient()
  const { data } = await db.from('trap_cards')
    .select('id, match_id, target_id, triggered, succeeded')
    .eq('attacker_id', user.id)
    .maybeSingle()
  return NextResponse.json(data ?? null)
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { match_id } = await req.json()
  const db = createServerClient()

  // One trap card per tournament
  const { data: existing } = await db.from('trap_cards')
    .select('id').eq('attacker_id', user.id).maybeSingle()
  if (existing) return NextResponse.json({ error: 'Ya usaste tu Carta Trampa este torneo.' }, { status: 409 })

  // Check match is not locked
  const { data: match } = await db.from('matches')
    .select('kick_off_time, status').eq('id', match_id).single()
  if (!match) return NextResponse.json({ error: 'Partido no encontrado.' }, { status: 404 })
  if (match.status !== 'pending') return NextResponse.json({ error: 'El partido ya comenzó o finalizó.' }, { status: 409 })
  const lockoutMs = new Date(match.kick_off_time).getTime() - 15 * 60 * 1000
  if (Date.now() >= lockoutMs) return NextResponse.json({ error: 'Predicciones bloqueadas (< 15 min).' }, { status: 403 })

  // Get current leader from ranking
  const rankingRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ranking`)
  const ranking: any[] = await rankingRes.json()
  const leader = ranking.find(u => u.id !== user.id)
  if (!leader) return NextResponse.json({ error: 'No hay rival para atacar.' }, { status: 400 })

  const { data, error } = await db.from('trap_cards')
    .insert({ attacker_id: user.id, target_id: leader.id, match_id })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ...data, leader_name: leader.username })
}
