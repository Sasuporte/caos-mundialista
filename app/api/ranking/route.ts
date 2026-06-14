import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { calculateMatchPoints, calculateLongTermPoints } from '@/lib/scoring'

export const dynamic = 'force-dynamic'

export async function GET() {
  const db = createServerClient()

  const [usersRes, matchesRes, predsRes, ltBetsRes, ltResultsRes, trapRes] = await Promise.all([
    db.from('users').select('id, username, is_admin, avatar_color, points_base'),
    db.from('matches').select('*'),
    db.from('predictions').select('*'),
    db.from('long_term_bets').select('*'),
    db.from('long_term_results').select('*').maybeSingle(),
    db.from('trap_cards').select('*').eq('triggered', true),
  ])

  const users = usersRes.data ?? []
  const matches = matchesRes.data ?? []
  const predictions = predsRes.data ?? []
  const ltBets = ltBetsRes.data ?? []
  const ltResults = ltResultsRes.data
  const trapCards = trapRes.data ?? []

  const ranked = users.map(user => {
    let total = user.points_base ?? 0
    const breakdown: { label: string; points: number }[] = []

    if (user.points_base > 0) {
      breakdown.push({ label: '🛡️ Fair Play (ingreso tardío)', points: user.points_base })
    }

    predictions.filter(p => p.user_id === user.id).forEach(pred => {
      const match = matches.find(m => m.id === pred.match_id)
      if (!match || match.status !== 'finished') return
      const pts = calculateMatchPoints(pred as any, match as any)
      if (pts !== 0) {
        total += pts
        breakdown.push({
          label: `${match.home_team} vs ${match.away_team}${pred.is_joker ? ' ⚡ Comodín' : ''}`,
          points: pts,
        })
      }
    })

    if (ltResults?.finalized) {
      const bet = ltBets.find(b => b.user_id === user.id)
      if (bet) {
        const ltPts = calculateLongTermPoints(bet as any, ltResults as any)
        if (ltPts > 0) { total += ltPts; breakdown.push({ label: '🏆 Apuestas Largo Plazo', points: ltPts }) }
      }
    }

    trapCards.filter(tc => tc.attacker_id === user.id && tc.succeeded).forEach(tc => {
      const pts = tc.points_stolen ?? 0
      if (pts > 0) { total += pts; breakdown.push({ label: '🂷 Carta Trampa (robaste)', points: pts }) }
    })
    trapCards.filter(tc => tc.target_id === user.id && tc.succeeded).forEach(tc => {
      const pts = tc.points_stolen ?? 0
      if (pts > 0) { total -= pts; breakdown.push({ label: '🂷 Carta Trampa (robaron)', points: -pts }) }
    })

    return { ...user, total_points: total, breakdown }
  })

  ranked.sort((a, b) => b.total_points - a.total_points)

  const threshold = Math.max(1, Math.ceil(ranked.length * 0.10))
  return NextResponse.json(
    ranked.map((u, i) => ({
      ...u,
      is_in_survival_mode: ranked.length > 3 && i >= ranked.length - threshold,
    }))
  )
}
