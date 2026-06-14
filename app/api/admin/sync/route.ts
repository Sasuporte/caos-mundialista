import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getSessionUser } from '@/lib/auth'

const FD_URL = 'https://api.football-data.org/v4'
const WC_CODE = 'WC'

function mapPhase(stage: string): string {
  switch (stage) {
    case 'GROUP_STAGE': return 'grupos'
    case 'LAST_32': return 'octavos'
    case 'LAST_16': return 'octavos'
    case 'QUARTER_FINALS': return 'cuartos'
    case 'SEMI_FINALS': return 'semis'
    case 'THIRD_PLACE': return 'semis'
    case 'FINAL': return 'final'
    default: return 'grupos'
  }
}

function mapMatchday(stage: string, matchday: number | null): number {
  if (stage === 'GROUP_STAGE') return matchday ?? 1
  const knockoutDay: Record<string, number> = {
    LAST_32: 4, LAST_16: 5, QUARTER_FINALS: 6,
    SEMI_FINALS: 7, THIRD_PLACE: 7, FINAL: 8,
  }
  return knockoutDay[stage] ?? 9
}

function mapStatus(status: string): 'pending' | 'live' | 'finished' {
  if (status === 'FINISHED' || status === 'AWARDED') return 'finished'
  if (status === 'IN_PLAY' || status === 'PAUSED' || status === 'EXTRA_TIME' || status === 'PENALTY_SHOOTOUT') return 'live'
  return 'pending'
}

async function runSync() {
  const apiKey = process.env.FOOTBALL_DATA_KEY
  if (!apiKey) throw new Error('FOOTBALL_DATA_KEY no configurada en variables de entorno de Vercel.')

  const res = await fetch(`${FD_URL}/competitions/${WC_CODE}/matches`, {
    headers: { 'X-Auth-Token': apiKey },
    cache: 'no-store',
  })

  if (res.status === 403) throw new Error('API key inválida o sin acceso al Mundial 2026. Verifica tu token en football-data.org.')
  if (!res.ok) throw new Error(`football-data.org error: ${res.status} ${res.statusText}`)

  const data = await res.json()
  const matches: any[] = data.matches ?? []

  const db = createServerClient()
  let synced = 0
  let updated = 0

  for (const m of matches) {
    const phase = mapPhase(m.stage)
    const status = mapStatus(m.status)

    const payload = {
      home_team: m.homeTeam?.name ?? 'TBD',
      away_team: m.awayTeam?.name ?? 'TBD',
      home_score: status !== 'pending' ? (m.score?.fullTime?.home ?? null) : null,
      away_score: status !== 'pending' ? (m.score?.fullTime?.away ?? null) : null,
      status,
      phase,
      matchday: mapMatchday(m.stage, m.matchday),
      kick_off_time: new Date(m.utcDate).toISOString(),
      api_match_id: String(m.id),
    }

    const { data: existing } = await db
      .from('matches').select('id')
      .eq('api_match_id', String(m.id)).maybeSingle()

    if (existing) {
      await db.from('matches').update(payload).eq('id', existing.id)
      updated++
    } else {
      await db.from('matches').insert(payload)
      synced++
    }
  }

  return { synced, updated, total: matches.length }
}

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  const isCron = secret && secret === process.env.SYNC_SECRET

  if (!isCron) {
    const user = await getSessionUser()
    if (!user?.is_admin) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  try {
    const result = await runSync()
    return NextResponse.json({ ok: true, ...result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runSync()
    return NextResponse.json({ ok: true, ...result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
