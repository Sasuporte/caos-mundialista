'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Flame, Skull } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (pin.length < 4) { setError('El PIN debe tener al menos 4 dígitos.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), pin, mode, inviteCode }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al ingresar.'); return }
      router.push('/partidos')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700">
        <div className="text-center mb-8">
          <Flame className="w-16 h-16 text-orange-500 mx-auto mb-4 animate-bounce" />
          <h1 className="text-3xl font-black bg-gradient-to-r from-orange-400 to-red-600 bg-clip-text text-transparent uppercase tracking-wider">
            Caos Mundialista
          </h1>
          <p className="text-slate-400 mt-2">La quiniela donde las amistades terminan.</p>
        </div>

        <div className="flex bg-slate-900 p-1 rounded-xl mb-6 border border-slate-700">
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
                mode === m ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
              }`}>
              {m === 'login' ? 'Entrar' : 'Registrarse'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Apodo</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500"
              placeholder="El Tío Táctico" required maxLength={32} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">PIN (4-6 dígitos)</label>
            <input type="password" inputMode="numeric" value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500 tracking-widest text-center text-2xl"
              placeholder="••••" required />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                🔑 Código de invitación
              </label>
              <input type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value)}
                className="w-full bg-slate-900 border border-orange-500/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500"
                placeholder="Pídele el código al organizador" required />
            </div>
          )}

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold py-3 rounded-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50">
            {loading ? 'Cargando...' : mode === 'login' ? 'Entrar a la Cancha' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Skull size={14} className="text-purple-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Reglas del Caos</span>
          </div>
          <ul className="text-xs text-slate-500 space-y-1">
            <li>• Acertar 0-0 exacto: <span className="text-green-400">+8 pts</span></li>
            <li>• Marcador exacto: <span className="text-green-400">+3 pts</span></li>
            <li>• Resultado correcto (1X2): <span className="text-green-400">+1 pt</span></li>
            <li>• Marcador espejo (ej: 2-1 → 1-2): <span className="text-blue-400">+2 pts consolación</span></li>
            <li>• Cuartos / Semis / Final: <span className="text-orange-400">×2 todo</span></li>
          </ul>
        </div>
      </div>
    </div>
  )
}
