import type { Match, Prediction } from './types'

export const PHASE_MULTIPLIER: Record<string, number> = {
  grupos: 1,
  octavos: 1,
  cuartos: 2,
  semis: 2,
  final: 2,
}

export const LONG_TERM_POINTS = {
  champion: 50,
  runner_up: 30,
  third_place: 20,
  top_scorer: 40,
  revelation_team: 25,
  disappointment_team: 25,
}

type PredInput = Pick<Prediction, 'home_score' | 'away_score' | 'is_joker'>
type MatchInput = Pick<Match, 'home_score' | 'away_score' | 'phase' | 'status'>

export function calculateMatchPoints(
  prediction: PredInput,
  match: MatchInput,
  isInSurvivalMode = false
): number {
  if (match.status !== 'finished' || match.home_score === null || match.away_score === null) return 0

  const pH = prediction.home_score
  const pA = prediction.away_score
  const rH = match.home_score
  const rA = match.away_score

  let base = 0

  if (pH === 0 && pA === 0 && rH === 0 && rA === 0) {
    base = 8 // 3 exact + 5 bonus
  } else if (pH === rH && pA === rA) {
    base = 3
  } else if (pH === rA && pA === rH && pH !== pA) {
    base = 2 // mirror consolation
  } else if (Math.sign(pH - pA) === Math.sign(rH - rA)) {
    base = 1
  }

  if (base <= 0) return 0

  const phase = PHASE_MULTIPLIER[match.phase] ?? 1
  let pts = base * phase
  if (prediction.is_joker) pts = pts * 2
  if (isInSurvivalMode) pts = Math.round(pts * 1.5)

  return pts
}

export function calculateLongTermPoints(
  bet: Partial<Record<keyof typeof LONG_TERM_POINTS, string | null>>,
  results: Partial<Record<keyof typeof LONG_TERM_POINTS, string | null>>
): number {
  let total = 0
  for (const key of Object.keys(LONG_TERM_POINTS) as (keyof typeof LONG_TERM_POINTS)[]) {
    const betVal = bet[key]
    const resVal = results[key]
    if (betVal && resVal && norm(betVal) === norm(resVal)) {
      total += LONG_TERM_POINTS[key]
    }
  }
  return total
}

export function computeInitialBalance(medianScore: number): number {
  return Math.round(medianScore * 0.70)
}

function norm(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}
