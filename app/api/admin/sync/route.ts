import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getSessionUser } from '@/lib/auth'

const API_URL = 'https://v3.football.api-sports.io'
const WC_LEAGUE = 1
const WC_SEASON = 2026

function mapPhase(round: string): string {
  const r = round.toLowerCase()
  if (r.includes('group')) return 'grupos'
  if (r.includes('32') || r.includes('round of 32')) return 'octavos'
  if (r.includes('16') || r.includes('round of 16')) return 'octavos'
  if (r.includes('quarter')) return 'cuartos'
  if (r.includes('semi')) return 'semis'
  if (r.includes('3rd') || r.includes('third')) return 'semis'
  if (r.includes('final')) return 'final'
  return 'grupos'
}

function mapMatchday(round: string, phase: string): number {
  if (phase === 'grupos') {
    const m = round.match(/(\d+)/)
    return m ? parseInt(m[1]) : 1
  }
  const r = round.toLowerCase()
  if (r.includes('32')) return 4
  if (r.includes('16')) return 5
  if (r.includes('quarter')) return 6
  if (r.includes('semi')) return 7
  if (r.includes('3rd') || r.includes('third')) return 7
  if (r.includes('final')) return 8
  return 9
}

function mapStatus(shortStatus: string): 'pending' | 'live' | 'finished' {
  if (['FT', 'AET', 'PEN', 'AWD', 'WO'].includes(shortStatus)) return 'finished'
  if (['1H', '2H', 'ET', 'BT', 'P', 'INT', 'LIVE'].includes(shortStatus)) return 'live'
  return 'pending'
}

async function runSync() {
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) throw new Error('API_FOOTBALL_KEY no configurada en variables de entorno.')

  const res = await fetch(`${API_URL}/fixtures?league=${WC_LEAGUE}&season=${WC_SEASON}`, {
    headers: { 'x-apisports-key': apiKey },
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`API-Football error: ${res.status} ${res.statusText}`)

  const data = await res.json()
  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(`API error: ${JSON.stringify(data.errors)}`)
  }

  const fixtures: any[] = data.response ?? []
  const db = createServerClient()
  let synced = 0
  let updated = 0

  for (const fixture of fixtures) {
    const { fixture: f, teams, goals, league } = fixture
    const phase = mapPhase(league.round ?? '')
    const matchday = mapMatchday(league.round ?? '', phase)
    const status = mapStatus(f.status?.short ?? 'NS')

    const payload = {
      home_team: teams.home.name,
      away_team: teams.away.name,
      home_flag: `https://media.api-sports.io/flags/${teams.home.id}.svg`,
      away_flag: `https://media.api-sports.io/flags/${teams.away.id}.svg`,
      home_score: status !== 'pending' ? (goals.home ?? null) : null,
      away_score: status !== 'pending' ? (goals.away ?? null) : null,
      status,
      phase,
      matchday,
      kick_off_time: new Date(f.date).toISOString(),
      api_match_id: String(f.id),
    }

    const { data: existing } = await db
      .from('matches')
      .select('id')
      .eq('api_match_id', String(f.id))
      .maybeSingle()

    if (existing) {
      await db.from('matches').update(payload).eq('id', existing.id)
      updated++
    } else {
      await db.from('matches').insert(payload)
      synced++
    }
  }

  return { synced, updated, total: fixtures.length }
}

// Admin manual trigger (requires session)
export async function POST(req: NextRequest) {
  // Allow cron secret token OR admin session
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

// Vercel Cron (GET, called automatically every hour)
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
