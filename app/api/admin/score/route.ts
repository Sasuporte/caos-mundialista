import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getSessionUser } from '@/lib/auth'
import { calculateMatchPoints } from '@/lib/scoring'

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user?.is_admin) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const { match_id, home_score, away_score } = await req.json()
  const db = createServerClient()

  const { data: match, error: mErr } = await db.from('matches')
    .update({ home_score, away_score, status: 'finished' })
    .eq('id', match_id).select().single()
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 })

  // Recalculate points for all predictions on this match
  const { data: preds } = await db.from('predictions').select('*').eq('match_id', match_id)
  if (preds) {
    await Promise.all(preds.map(p => {
      const pts = calculateMatchPoints(p as any, match as any)
      return db.from('predictions').update({ points_earned: pts }).eq('id', p.id)
    }))
  }

  // Evaluate trap cards for this match
  const { data: traps } = await db.from('trap_cards').select('*').eq('match_id', match_id).eq('triggered', false)
  if (traps) {
    await Promise.all(traps.map(async tc => {
      const pred = preds?.find(p => p.user_id === tc.attacker_id)
      const pts = pred ? calculateMatchPoints(pred as any, match as any) : 0
      const succeeded = pts > 0
      let pointsStolen = 0
      if (succeeded) {
        const victimPred = preds?.find(p => p.user_id === tc.target_id)
        const victimPts = victimPred ? calculateMatchPoints(victimPred as any, match as any) : 0
        pointsStolen = Math.round(victimPts * 0.20)
      }
      await db.from('trap_cards').update({ triggered: true, succeeded, points_stolen: pointsStolen }).eq('id', tc.id)
    }))
  }

  return NextResponse.json({ ok: true, match })
}
