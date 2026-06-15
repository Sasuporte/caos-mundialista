import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getSessionUser } from '@/lib/auth'

export async function GET() {
  const db = createServerClient()
  const { data } = await db.from('chaos_events')
    .select('*, matches(home_team, away_team)')
    .order('created_at', { ascending: false })
  return NextResponse.json(data ?? [])
}

// Create a chaos event
export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user?.is_admin) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const { event_type, description, points_bonus, match_id } = await req.json()
  if (!event_type || !points_bonus) return NextResponse.json({ error: 'Faltan datos.' }, { status: 400 })

  const db = createServerClient()
  const { data, error } = await db.from('chaos_events')
    .insert({ event_type, description, points_bonus, match_id: match_id || null })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Validate a chaos event and distribute points to all users
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser()
  if (!user?.is_admin) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const { event_id } = await req.json()
  const db = createServerClient()

  const { data: event } = await db.from('chaos_events').select('*').eq('id', event_id).single()
  if (!event) return NextResponse.json({ error: 'Evento no encontrado.' }, { status: 404 })
  if (event.validated) return NextResponse.json({ error: 'Ya validado.' }, { status: 409 })

  // Mark as validated
  await db.from('chaos_events').update({
    validated: true, validated_by: user.id, validated_at: new Date().toISOString()
  }).eq('id', event_id)

  // Give bonus points to ALL active users
  const { data: users } = await db.from('users').select('id, points_base').eq('is_banned', false)
  if (users) {
    await Promise.all(users.map(u =>
      db.from('users').update({ points_base: (u.points_base ?? 0) + event.points_bonus }).eq('id', u.id)
    ))
  }

  return NextResponse.json({ ok: true, distributed_to: users?.length ?? 0, points: event.points_bonus })
}
