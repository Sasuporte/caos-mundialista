import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export async function GET() {
  return NextResponse.json({
    url_baked: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'NO DEFINIDA',
    service_key_prefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 30) ?? 'NO DEFINIDA',
    anon_key_prefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 30) ?? 'NO DEFINIDA',
  })
}
