import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getSessionUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { match_id, league_id } = await req.json()
  const db = createServerClient()

  // Check user hasn't already played a trap card in this league
  const { data: existing } = await db.from('trap_cards')
    .select('id').eq('league_id', league_id).eq('attacker_id', user.id).maybeSingle()
  if (existing) return NextResponse.json({ error: 'Ya usaste tu Carta Trampa.' }, { status: 409 })

  // Target = current leader in ranking (fetched from ranking API internally)
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ranking`)
  const ranking = await res.json()
  const leader = ranking.find((u: any) => u.id !== user.id)
  if (!leader) return NextResponse.json({ error: 'No hay rival para atacar.' }, { status: 400 })

  const { data, error } = await db.from('trap_cards')
    .insert({ league_id, attacker_id: user.id, target_id: leader.id, match_id })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
