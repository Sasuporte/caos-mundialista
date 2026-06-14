'use client'

import { useState, useEffect } from 'react'
import { Trophy, Frown, ChevronDown, ChevronUp, Skull, Flame } from 'lucide-react'
import type { AuthUser, RankedUser } from '@/lib/types'
import Header from './Header'

export default function RankingClient({ currentUser }: { currentUser: AuthUser }) {
  const [ranking, setRanking] = useState<RankedUser[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
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

        <div className="space-y-2">
          {ranking.map((user, i) => {
            const isFirst = i === 0
            const isLast = i === ranking.length - 1 && ranking.length > 1
            const isMe = user.id === currentUser.id
            const isOpen = expanded === user.id
            return (
              <div key={user.id}>
                <div onClick={() => setExpanded(isOpen ? null : user.id)}
                  className={`flex items-center justify-between p-4 cursor-pointer transition-all ${
                    isOpen ? 'rounded-t-xl' : 'rounded-xl'
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
                    <span className={`text-2xl font-black ${
                      isLast ? 'text-red-400' : isFirst ? 'text-yellow-300' : 'text-white'
                    }`}>{user.total_points}</span>
                    <span className="text-xs text-slate-500">pts</span>
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

        <div className="mt-8 bg-slate-800 border border-slate-700 rounded-xl p-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Skull size={12}/> Reglas del Caos</p>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>• 0-0 exacto: <span className="text-green-400">+8 pts</span></li>
            <li>• Marcador exacto: <span className="text-green-400">+3 pts</span></li>
            <li>• Resultado (1X2): <span className="text-green-400">+1 pt</span></li>
            <li>• Espejo (2-1 → 1-2): <span className="text-blue-400">+2 pts consolación</span></li>
            <li>• Cuartos / Semis / Final: <span className="text-orange-400">×2</span></li>
            <li>• Comodín por jornada: <span className="text-yellow-400">×2 extra</span></li>
            <li>• Modo Supervivencia (último 10%): <span className="text-red-400">×1.5 todo</span></li>
          </ul>
        </div>
      </main>
    </div>
  )
}
