import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getSessionUser } from '@/lib/auth'

export async function GET() {
  const db = createServerClient()
  const { data } = await db.from('chaos_events').select('*').order('created_at', { ascending: false })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user?.is_admin) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const body = await req.json()
  const db = createServerClient()
  const { data, error } = await db.from('chaos_events')
    .update({ validated: true, validated_by: user.id, validated_at: new Date().toISOString() })
    .eq('id', body.event_id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
