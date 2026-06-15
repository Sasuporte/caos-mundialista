import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getSessionUser } from '@/lib/auth'
import { calculateMatchPoints } from '@/lib/scoring'

export async function POST() {
  const user = await getSessionUser()
  if (!user?.is_admin) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const db = createServerClient()

  // Obtener todos los partidos finalizados con score
  const { data: matches } = await db
    .from('matches')
    .select('*')
    .eq('status', 'finished')
    .not('home_score', 'is', null)
    .not('away_score', 'is', null)

  if (!matches || matches.length === 0) {
    return NextResponse.json({ ok: true, updated: 0 })
  }

  let updated = 0

  for (const match of matches) {
    const { data: preds } = await db
      .from('predictions')
      .select('*')
      .eq('match_id', match.id)

    if (!preds || preds.length === 0) continue

    await Promise.all(preds.map(p => {
      const pts = calculateMatchPoints(p as any, match as any)
      updated++
      return db.from('predictions').update({ points_earned: pts }).eq('id', p.id)
    }))
  }

  return NextResponse.json({ ok: true, updated, matches: matches.length })
}
