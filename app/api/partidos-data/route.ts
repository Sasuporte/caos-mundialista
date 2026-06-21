import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getSessionUser } from '@/lib/auth'
import { unstable_noStore as noStore } from 'next/cache'

export const dynamic = 'force-dynamic'

// Endpoint consolidado: devuelve matches + predictions + trap-card + ranking en 1 sola llamada.
// Reduce de 4 round-trips HTTP a 1, con todas las queries en paralelo server-side.
export async function GET() {
  noStore()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const db = createServerClient()

  const [matchesRes, predsRes, tcRes, rankRes] = await Promise.all([
    db.from('matches').select('*').order('kick_off_time', { ascending: true }),
    db.from('predictions').select('*').eq('user_id', user.id),
    db.from('trap_cards')
      .select('id, match_id, target_id, triggered, succeeded')
      .eq('attacker_id', user.id)
      .maybeSingle(),
    db.from('users').select('id, username, is_admin, avatar_color, points_base'),
  ])

  return NextResponse.json({
    matches: matchesRes.data ?? [],
    predictions: predsRes.data ?? [],
    trapCard: tcRes.data ?? null,
    users: rankRes.data ?? [],
  }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
