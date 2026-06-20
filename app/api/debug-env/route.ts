import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { unstable_noStore as noStore } from 'next/cache'

export const dynamic = 'force-dynamic'

export async function GET() {
  noStore()
  const timestamp = Date.now()

  // Via Supabase JS client (PostgREST)
  const db = createServerClient()
  const { count: jsCount, error: jsErr } = await db
    .from('predictions')
    .select('*', { count: 'exact', head: true })

  // Via fetch directo al REST API (sin JS client)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const restRes = await fetch(
    `${url}/rest/v1/predictions?select=id&limit=3`,
    {
      headers: {
        apikey: key!,
        Authorization: `Bearer ${key}`,
        'Cache-Control': 'no-store',
      },
      cache: 'no-store',
    }
  )
  const restData = await restRes.json()

  return NextResponse.json({
    timestamp,
    js_client_count: jsCount,
    js_client_error: jsErr?.message ?? null,
    direct_rest_count: Array.isArray(restData) ? restData.length : restData,
    direct_rest_sample: restData,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
