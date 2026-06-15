'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Flame, KeyRound, X } from 'lucide-react'
import { useState } from 'react'
import type { AuthUser } from '@/lib/types'
import { useSwipeNav } from '@/lib/hooks/useSwipeNav'

const TABS = [
  { href: '/partidos', label: '⚽ Partidos', short: '⚽', key: 'partidos' },
  { href: '/ranking', label: '🏆 Ranking', short: '🏆', key: 'ranking' },
  { href: '/bonus', label: '🎯 Bonus', short: '🎯', key: 'bonus' },
  { href: '/historial', label: '📊 Historial', short: '📊', key: 'historial' },
]

function ChangePinModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (next !== confirm) { setMsg({ ok: false, text: 'Los PINs nuevos no coinciden.' }); return }
    setLoading(true)
    const res = await fetch('/api/auth/change-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPin: current, newPin: next }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setMsg({ ok: false, text: data.error }); return }
    setMsg({ ok: true, text: '✓ PIN actualizado correctamente.' })
    setTimeout(onClose, 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-black text-white flex items-center gap-2"><KeyRound size={16} className="text-orange-400"/> Cambiar PIN</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18}/></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {[['PIN actual', current, setCurrent], ['PIN nuevo (4-6 dígitos)', next, setNext], ['Confirmar PIN nuevo', confirm, setConfirm]]
            .map(([label, val, setter]: any) => (
              <div key={label as string}>
                <label className="text-xs text-slate-400 mb-1 block">{label as string}</label>
                <input type="password" inputMode="numeric" value={val as string}
                  onChange={e => (setter as any)(e.target.value.replace(/\D/g,'').slice(0,6))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-center text-xl tracking-widest focus:outline-none focus:border-orange-500"
                  placeholder="••••" required />
              </div>
            ))}
          {msg && <p className={`text-sm text-center ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 rounded-lg disabled:opacity-50 mt-1">
            {loading ? 'Guardando...' : 'Actualizar PIN'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function Header({ currentUser, activeTab }: { currentUser: AuthUser; activeTab?: string }) {
  const router = useRouter()
  const [showPinModal, setShowPinModal] = useState(false)
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
    <>
      {showPinModal && <ChangePinModal onClose={() => setShowPinModal(false)} />}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
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
          <div className="flex items-center gap-2">
            <button onClick={() => setShowPinModal(true)}
              className="bg-slate-900 px-3 py-1 rounded-full border border-slate-700 text-sm text-slate-300 hover:border-orange-500 transition-colors flex items-center gap-1.5">
              {currentUser.username}
              <KeyRound size={11} className="text-slate-600" />
            </button>
            <button onClick={logout} className="text-xs text-red-400 hover:text-red-300">Salir</button>
          </div>
        </div>
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
    </>
  )
}
