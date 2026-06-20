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
  if (traps && traps.length > 0) {
    const { data: allFinishedMatches } = await db.from('matches').select('*').eq('status', 'finished')

    await Promise.all(traps.map(async tc => {
      const attackerPred = preds?.find(p => p.user_id === tc.attacker_id)

      // La trampa solo se activa si el atacante acierta el marcador EXACTO
      const succeeded = attackerPred != null &&
        attackerPred.home_score === match.home_score &&
        attackerPred.away_score === match.away_score

      let pointsStolen = 0
      if (succeeded) {
        // Robar el 20% del TOTAL acumulado del lider, no solo de este partido
        const [{ data: victimUser }, { data: victimPreds }] = await Promise.all([
          db.from('users').select('points_base').eq('id', tc.target_id).single(),
          db.from('predictions').select('*').eq('user_id', tc.target_id),
        ])

        let victimTotal = victimUser?.points_base ?? 0
        ;(victimPreds ?? []).forEach((vp: any) => {
          const m = (allFinishedMatches ?? []).find((fm: any) => fm.id === vp.match_id)
          if (m) victimTotal += calculateMatchPoints(vp, m)
        })

        pointsStolen = Math.round(victimTotal * 0.20)
      }

      return db.from('trap_cards')
        .update({ triggered: true, succeeded, points_stolen: pointsStolen })
        .eq('id', tc.id)
    }))
  }

  return NextResponse.json({ ok: true, match })
}
