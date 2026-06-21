import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// Los partidos solo cambian cuando el admin actualiza resultados.
// Cache de 30s reduce carga en Supabase y mejora TTFB.
export const revalidate = 30

export async function GET() {
  const db = createServerClient()
  const { data, error } = await db
    .from('matches')
    .select('*')
    .order('kick_off_time', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
