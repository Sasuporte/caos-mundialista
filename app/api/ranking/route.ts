import { NextResponse } from 'next/server'
import { unstable_noStore as noStore } from 'next/cache'
import { createServerClient } from '@/lib/supabase-server'
import { calculateMatchPoints, calculateLongTermPoints } from '@/lib/scoring'

export const dynamic = 'force-dynamic'

type BreakdownItem = { label: string; points: number }

function buildScore(
  user: any,
  predictions: any[],
  matches: any[],
  ltBets: any[],
  ltResults: any,
  trapCards: any[],
  isInSurvivalMode: boolean
): { total: number; breakdown: BreakdownItem[] } {
  let total = user.points_base ?? 0
  const breakdown: BreakdownItem[] = []

  if (user.points_base > 0) {
    breakdown.push({ label: '🛡️ Fair Play (ingreso tardío)', points: user.points_base })
  }

  predictions.filter(p => p.user_id === user.id).forEach(pred => {
    const match = matches.find(m => m.id === pred.match_id)
    if (!match || match.status !== 'finished') return
    const pts = calculateMatchPoints(pred as any, match as any, isInSurvivalMode)
    if (pts !== 0) {
      total += pts
      breakdown.push({
        label: `${match.home_team} vs ${match.away_team}${pred.is_joker ? ' ⚡ Comodín' : ''}${isInSurvivalMode ? ' 🐢×1.5' : ''}`,
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

  return { total, breakdown }
}

export async function GET() {
  noStore()
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

  // Primera pasada: sin bonus de supervivencia para determinar posiciones
  const firstPass = users.map(user => {
    const { total, breakdown } = buildScore(user, predictions, matches, ltBets, ltResults, trapCards, false)
    return { ...user, total_points: total, breakdown }
  })
  firstPass.sort((a, b) => b.total_points - a.total_points)

  const threshold = Math.max(1, Math.ceil(firstPass.length * 0.10))
  const survivalSet = new Set<string>(
    firstPass.length > 3
      ? firstPass.slice(firstPass.length - threshold).map(u => u.id)
      : []
  )

  // Segunda pasada: recalcular usuarios en supervivencia con multiplicador x1.5
  const ranked = firstPass.map(user => {
    if (!survivalSet.has(user.id)) return { ...user, is_in_survival_mode: false }
    const { total, breakdown } = buildScore(user, predictions, matches, ltBets, ltResults, trapCards, true)
    return { ...user, total_points: total, breakdown, is_in_survival_mode: true }
  })

  ranked.sort((a, b) => b.total_points - a.total_points)

  return NextResponse.json(ranked, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate", "CDN-Cache-Control": "no-store", "Vercel-CDN-Cache-Control": "no-store" } })
}
