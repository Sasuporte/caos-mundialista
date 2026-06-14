export type Phase = 'grupos' | 'octavos' | 'cuartos' | 'semis' | 'final'
export type MatchStatus = 'pending' | 'live' | 'finished'

export interface User {
  id: string
  username: string
  is_admin: boolean
  avatar_color: string
  created_at: string
}

export interface Match {
  id: string
  home_team: string
  away_team: string
  home_flag?: string
  away_flag?: string
  home_score: number | null
  away_score: number | null
  status: MatchStatus
  phase: Phase
  matchday: number
  kick_off_time: string
  api_match_id?: string
}

export interface Prediction {
  id: string
  user_id: string
  match_id: string
  home_score: number
  away_score: number
  is_joker: boolean
  points_earned: number | null
}

export interface TrapCard {
  id: string
  league_id: string
  attacker_id: string
  target_id: string
  match_id: string
  triggered: boolean
  succeeded: boolean | null
  points_stolen: number | null
}

export interface LongTermBet {
  id: string
  user_id: string
  champion: string | null
  runner_up: string | null
  third_place: string | null
  top_scorer: string | null
  revelation_team: string | null
  disappointment_team: string | null
  locked: boolean
  points_earned: number
}

export interface LongTermResults {
  champion: string | null
  runner_up: string | null
  third_place: string | null
  top_scorer: string | null
  revelation_team: string | null
  disappointment_team: string | null
  finalized: boolean
}

export interface ChaosEvent {
  id: string
  match_id: string | null
  event_type: string
  description: string | null
  points_bonus: number
  validated: boolean
}

export interface RankedUser extends User {
  total_points: number
  breakdown: { label: string; points: number }[]
  is_in_survival_mode: boolean
}

export interface AuthUser {
  id: string
  username: string
  is_admin: boolean
  avatar_color: string
  token: string
}
