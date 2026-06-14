'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Flame, Skull, Trophy, Zap, Shield } from 'lucide-react'

const RULES = [
  {
    icon: '🎯',
    title: 'Puntuación base',
    items: [
      { label: 'Marcador 0-0 exacto', pts: '+8 pts', detail: '(3 exacto + 5 bonus)' },
      { label: 'Marcador exacto', pts: '+3 pts', detail: 'Ej: predijiste 2-1 y quedó 2-1' },
      { label: 'Resultado correcto (1X2)', pts: '+1 pt', detail: 'Acertaste quién ganó o empate' },
      { label: 'Marcador espejo', pts: '+2 pts', detail: 'Predijiste 2-1, quedó 1-2 (consolación)' },
    ],
  },
  {
    icon: '×2',
    title: 'Multiplicadores de fase',
    items: [
      { label: 'Grupos y Octavos', pts: 'x1', detail: 'Puntos normales sin cambio' },
      { label: 'Cuartos de final', pts: 'x2', detail: 'Todo se duplica' },
      { label: 'Semifinales', pts: 'x2', detail: 'Todo se duplica' },
      { label: 'Final', pts: 'x2', detail: 'Todo se duplica' },
    ],
  },
  {
    icon: '⚡',
    title: 'Comodín (Joker)',
    items: [
      { label: '1 comodín por jornada', pts: 'x2 extra', detail: 'Dobla los puntos de ese partido' },
      { label: 'Fórmula', pts: '', detail: '(Base × Fase) × 2' },
      { label: 'Límite', pts: '', detail: 'Debe activarse antes del inicio del partido' },
    ],
  },
  {
    icon: '🂷',
    title: 'Reglas de Caos',
    items: [
      { label: 'Carta Trampa', pts: 'Roba 20%', detail: 'Si aciertas exacto en el partido marcado, robas el 20% de los pts del líder en ese partido' },
      { label: 'Modo Supervivencia', pts: 'x1.5', detail: 'Último 10% del ranking recibe multiplicador de caos' },
    ],
  },
  {
    icon: '🏆',
    title: 'Apuestas de Largo Plazo',
    items: [
      { label: 'Campeón del Mundo', pts: '+50 pts', detail: 'Se bloquea antes del primer partido' },
      { label: 'Subcampeón', pts: '+30 pts', detail: '' },
      { label: 'Tercer lugar', pts: '+20 pts', detail: '' },
      { label: 'Bota de Oro (goleador)', pts: '+40 pts', detail: '' },
      { label: 'Equipo Revelación', pts: '+25 pts', detail: 'Top >15 FIFA que llegue más lejos' },
      { label: 'Decepcón del torneo', pts: '+25 pts', detail: 'Top 10 FIFA eliminado en grupos' },
    ],
  },
  {
    icon: '🛡️',
    title: 'Fair Play (ingreso tardío)',
    items: [
      { label: '1 punto por partido finalizado', pts: 'automático', detail: 'Al registrarte recibes compensación por los partidos que ya pasaron' },
    ],
  },
]

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showRules, setShowRules] = useState(false)

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
      <div className="max-w-md w-full space-y-4">
        {/* Login card */}
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
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
                <label className="block text-sm font-medium text-slate-400 mb-2">🔑 Código de invitación</label>
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
        </div>

        {/* Rules toggle */}
        <button onClick={() => setShowRules(!showRules)}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm font-bold text-slate-300 transition-colors">
          <Skull size={15} className="text-purple-400" />
          {showRules ? 'Ocultar reglas' : 'Ver todas las reglas del Caos'}
        </button>

        {showRules && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-5">
            {RULES.map(section => (
              <div key={section.title}>
                <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span>{section.icon}</span> {section.title}
                </h3>
                <ul className="space-y-1.5">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-slate-500 mt-0.5">•</span>
                      <span className="text-slate-400 flex-1">
                        <span className="text-slate-200 font-semibold">{item.label}</span>
                        {item.pts && <span className="ml-1 text-orange-400 font-black">{item.pts}</span>}
                        {item.detail && <span className="ml-1 text-slate-500">— {item.detail}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
