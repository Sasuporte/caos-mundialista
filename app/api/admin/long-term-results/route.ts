import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getSessionUser } from '@/lib/auth'
import { calculateLongTermPoints } from '@/lib/scoring'

export async function GET() {
  const db = createServerClient()
  const { data } = await db.from('long_term_results').select('*').maybeSingle()
  return NextResponse.json(data ?? null)
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user?.is_admin) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const body = await req.json()
  const db = createServerClient()

  const { data: existing } = await db.from('long_term_results').select('id').maybeSingle()
  let results
  if (existing) {
    const { data } = await db.from('long_term_results').update({ ...body, updated_at: new Date().toISOString() }).eq('id', existing.id).select().single()
    results = data
  } else {
    const { data } = await db.from('long_term_results').insert(body).select().single()
    results = data
  }

  if (body.finalized) {
    const { data: bets } = await db.from('long_term_bets').select('*')
    if (bets && results) {
      await Promise.all(bets.map(bet => {
        const pts = calculateLongTermPoints(bet as any, results as any)
        return db.from('long_term_bets').update({ points_earned: pts }).eq('id', bet.id)
      }))
    }
  }

  return NextResponse.json(results)
}
