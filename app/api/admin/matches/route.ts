import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getSessionUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user?.is_admin) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const body = await req.json()
  const db = createServerClient()

  const { data, error } = await db.from('matches').insert({
    home_team: body.home_team,
    away_team: body.away_team,
    phase: body.phase,
    matchday: body.matchday,
    kick_off_time: new Date(body.kick_off_time).toISOString(),
    status: body.status ?? 'pending',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
