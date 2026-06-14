import { cookies } from 'next/headers'
import { createServerClient } from './supabase-server'
import type { AuthUser } from './types'

export const SESSION_COOKIE = 'caos_session'
export const SESSION_DAYS = 90

export async function getSessionUser(): Promise<AuthUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!token) return null

  const db = createServerClient()
  const { data } = await db
    .from('sessions')
    .select('user_id, expires_at, users(id, username, is_admin, avatar_color)')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!data) return null
  const u = data.users as any
  return { id: u.id, username: u.username, is_admin: u.is_admin, avatar_color: u.avatar_color, token }
}
