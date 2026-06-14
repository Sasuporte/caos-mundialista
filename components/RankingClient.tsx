'use client'

import { useState, useEffect } from 'react'
import { Trophy, Frown, ChevronDown, ChevronUp, Skull, Flame, Zap, Shield } from 'lucide-react'
import type { AuthUser, RankedUser } from '@/lib/types'
import Header from './Header'

const RULES_SECTIONS = [
  {
    title: '🎯 Puntuación base',
    items: [
      { label: '0-0 exacto', pts: '+8 pts', detail: '3 de marcador exacto + 5 de bonus especial' },
      { label: 'Marcador exacto', pts: '+3 pts', detail: 'Coinciden los goles de ambos equipos' },
      { label: 'Resultado correcto (1X2)', pts: '+1 pt', detail: 'Acertaste ganador o empate' },
      { label: 'Marcador espejo', pts: '+2 pts', detail: 'Predijiste 2-1, quedó 1-2 (consolación)' },
      { label: 'Fallo total', pts: '0 pts', detail: 'Sin puntos' },
    ],
  },
  {
    title: '×2 Multiplicadores de fase',
    items: [
      { label: 'Grupos y Octavos', pts: 'x1', detail: 'Puntos normales' },
      { label: 'Cuartos / Semis / Final', pts: 'x2', detail: 'Todos los puntos se duplican' },
    ],
  },
  {
    title: '⚡ Comodín (Joker)',
    items: [
      { label: '1 comodín disponible por jornada', pts: 'x2 extra', detail: 'Dobla los puntos del partido elegido. Fórmula: (Base × Fase) × 2' },
      { label: 'Restricción', pts: '', detail: 'Debes activarlo antes del inicio del partido. No acumula' },
    ],
  },
  {
    title: '🂷 Mecánicas de Caos',
    items: [
      { label: 'Carta Trampa', pts: 'Roba 20%', detail: 'Marca al líder en un partido. Si aciertas el marcador exacto, robas el 20% de sus puntos en ese partido' },
      { label: 'Modo Supervivencia', pts: 'x1.5', detail: 'Si estás en el último 10% del ranking, tus puntos tienen multiplicador de caos extra' },
    ],
  },
  {
    title: '🏆 Apuestas de Largo Plazo',
    items: [
      { label: 'Campeón', pts: '+50 pts', detail: 'Se bloquean antes del primer partido del torneo' },
      { label: 'Subcampeón', pts: '+30 pts', detail: '' },
      { label: 'Tercer lugar', pts: '+20 pts', detail: '' },
      { label: 'Bota de Oro', pts: '+40 pts', detail: 'Máximo goleador individual' },
      { label: 'Equipo Revelación', pts: '+25 pts', detail: 'Top >15 FIFA que llegue más lejos' },
      { label: 'Decepcón del Torneo', pts: '+25 pts', detail: 'Top 10 FIFA eliminado en fase de grupos' },
    ],
  },
  {
    title: '🛡️ Fair Play',
    items: [
      { label: 'Compensación por ingreso tardío', pts: 'automático', detail: 'Al registrarte recibes 1 punto por cada partido ya finalizado. Nadie queda fuera de combate' },
    ],
  },
]

export default function RankingClient({ currentUser }: { currentUser: AuthUser }) {
  const [ranking, setRanking] = useState<RankedUser[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showRules, setShowRules] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/ranking').then(r => r.json()).then(d => { setRanking(d); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <Flame className="text-orange-500 animate-spin" size={32} />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 pb-20">
      <Header currentUser={currentUser} activeTab="ranking" />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-black mb-6 flex items-center gap-2">
          <Trophy className="text-yellow-500" /> Tabla del Caos
        </h1>

        {/* Ranking list */}
        <div className="space-y-2 mb-8">
          {ranking.map((user, i) => {
            const isFirst = i === 0
            const isLast = i === ranking.length - 1 && ranking.length > 1
            const isMe = user.id === currentUser.id
            const isOpen = expanded === user.id
            return (
              <div key={user.id}>
                <div onClick={() => setExpanded(isOpen ? null : user.id)}
                  className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all ${
                    isOpen ? 'rounded-b-none' : ''
                  } ${
                    isFirst ? 'bg-gradient-to-r from-yellow-600/20 to-slate-800 border border-yellow-500/50'
                    : isLast ? 'bg-red-950/40 border-2 border-dashed border-red-500/40'
                    : 'bg-slate-800 border border-slate-700 hover:border-slate-500'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${
                      isFirst ? 'bg-yellow-500 text-black'
                      : i === 1 ? 'bg-slate-400 text-black'
                      : i === 2 ? 'bg-amber-700 text-white'
                      : isLast ? 'bg-red-600 text-white'
                      : 'bg-slate-700 text-slate-300'
                    }`}>
                      {isLast ? <Frown size={14}/> : i + 1}
                    </div>
                    <div>
                      <div className="font-bold flex items-center gap-2 flex-wrap">
                        {user.username}
                        {isMe && <span className="text-xs bg-orange-600 px-2 py-0.5 rounded text-white">Tú</span>}
                        {user.is_in_survival_mode && <span className="text-xs text-red-400 border border-red-500/40 px-1.5 rounded">🐢 Supervivencia</span>}
                      </div>
                      {isLast && <p className="text-xs text-red-400">Se busca DT urgente</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div>
                      <div className={`text-2xl font-black ${
                        isLast ? 'text-red-400' : isFirst ? 'text-yellow-300' : 'text-white'
                      }`}>{user.total_points}</div>
                      <div className="text-[10px] text-slate-500 text-right">pts</div>
                    </div>
                    {isOpen ? <ChevronUp size={14} className="text-slate-500"/> : <ChevronDown size={14} className="text-slate-500"/>}
                  </div>
                </div>
                {isOpen && (
                  <div className={`p-4 rounded-b-xl bg-slate-800/60 border-x border-b ${
                    isFirst ? 'border-yellow-500/30'
                    : isLast ? 'border-dashed border-red-500/30'
                    : 'border-slate-700'
                  }`}>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Desglose de Puntos</p>
                    {user.breakdown.length > 0 ? (
                      <ul className="space-y-1.5">
                        {user.breakdown.map((b, j) => (
                          <li key={j} className="flex justify-between text-sm">
                            <span className="text-slate-300 truncate pr-4">{b.label}</span>
                            <span className={`font-black shrink-0 ${
                              b.points > 0 ? 'text-green-400' : 'text-red-400'
                            }`}>{b.points > 0 ? '+' : ''}{b.points}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500 italic">Sin puntos aún.</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Rules section */}
        <button onClick={() => setShowRules(!showRules)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm font-bold text-slate-300 transition-colors mb-4">
          <Skull size={15} className="text-purple-400" />
          {showRules ? 'Ocultar reglas' : 'Ver todas las reglas del Caos'}
        </button>

        {showRules && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-5">
            {RULES_SECTIONS.map(section => (
              <div key={section.title}>
                <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider mb-3">{section.title}</h3>
                <ul className="space-y-2">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-slate-600 mt-0.5">•</span>
                      <span className="flex-1">
                        <span className="text-slate-200 font-semibold">{item.label}</span>
                        {item.pts && <span className="ml-2 text-orange-400 font-black">{item.pts}</span>}
                        {item.detail && <p className="text-slate-500 mt-0.5">{item.detail}</p>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
