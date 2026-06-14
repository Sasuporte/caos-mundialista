'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Flame } from 'lucide-react'
import type { AuthUser } from '@/lib/types'
import { useSwipeNav } from '@/lib/hooks/useSwipeNav'

const TABS = [
  { href: '/partidos', label: '⚽ Partidos', short: '⚽', key: 'partidos' },
  { href: '/ranking', label: '🏆 Ranking', short: '🏆', key: 'ranking' },
  { href: '/bonus', label: '🎯 Bonus', short: '🎯', key: 'bonus' },
  { href: '/historial', label: '📊 Historial', short: '📊', key: 'historial' },
]

export default function Header({ currentUser, activeTab }: { currentUser: AuthUser; activeTab?: string }) {
  const router = useRouter()
  const tabs = currentUser.is_admin
    ? [...TABS, { href: '/admin', label: '⚙️ Admin', short: '⚙️', key: 'admin' }]
    : TABS

  useSwipeNav(activeTab ?? 'partidos', currentUser.is_admin)

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/partidos" className="flex items-center gap-2">
          <Flame className="text-orange-500" size={20} />
          <span className="font-black text-lg hidden sm:block bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            Caos Mundialista
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {tabs.map(({ href, label, key }) => (
            <Link key={href} href={href}
              className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-colors ${
                activeTab === key ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
              }`}>{label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="bg-slate-900 px-3 py-1 rounded-full border border-slate-700 text-sm text-slate-300">
            {currentUser.username}
          </span>
          <button onClick={logout} className="text-xs text-red-400 hover:text-red-300">Salir</button>
        </div>
      </div>
      {/* Mobile nav */}
      <div className="md:hidden border-t border-slate-700 flex">
        {tabs.map(({ href, short, key }) => (
          <Link key={href} href={href}
            className={`flex-1 py-2 text-center text-base transition-colors ${
              activeTab === key ? 'border-b-2 border-orange-500 bg-orange-600/10' : 'text-slate-600'
            }`}>{short}</Link>
        ))}
      </div>
      <div className="md:hidden text-center py-0.5 bg-slate-900/50">
        <span className="text-[10px] text-slate-700">← desliza para navegar →</span>
      </div>
    </header>
  )
}
