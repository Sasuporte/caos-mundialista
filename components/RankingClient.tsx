'use client'

import { useState, useEffect, useRef } from 'react'
import { Trophy, Frown, ChevronDown, ChevronUp, Skull, Flame, Radio } from 'lucide-react'
import type { AuthUser, RankedUser } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import Header from './Header'

const RULES = [
  { title: '🎯 Puntuación base', items: [
    { label: '0-0 exacto', pts: '+8 pts', detail: '3 exacto + 5 bonus' },
    { label: 'Marcador exacto', pts: '+3 pts', detail: '' },
    { label: 'Resultado correcto (1X2)', pts: '+1 pt', detail: '' },
    { label: 'Marcador espejo (2-1 → 1-2)', pts: '+2 pts', detail: 'Consolación' },
  ]},
  { title: '×2 Multiplicadores', items: [
    { label: 'Grupos y Octavos', pts: 'x1', detail: '' },
    { label: 'Cuartos / Semis / Final', pts: 'x2', detail: 'Todo se duplica' },
  ]},
  { title: '⚡ Comodín', items: [
    { label: '1 por jornada', pts: 'x2 extra', detail: 'Fórmula: (Base × Fase) × 2' },
  ]},
  { title: '🂷 Caos', items: [
    { label: 'Carta Trampa', pts: '20% robado', detail: 'Aciertas exacto en partido marcado → robas 20% del líder' },
    { label: 'Modo Supervivencia', pts: 'x1.5', detail: 'Último 10% del ranking' },
  ]},
  { title: '🏆 Largo Plazo', items: [
    { label: 'Campeón', pts: '+50', detail: '' }, { label: 'Subcampeón', pts: '+30', detail: '' },
    { label: 'Tercer lugar', pts: '+20', detail: '' }, { label: 'Bota de Oro', pts: '+40', detail: '' },
    { label: 'Revelación', pts: '+25', detail: '' }, { label: 'Decepcón', pts: '+25', detail: '' },
  ]},
]

function shareOnWhatsApp(username: string, position: number, points: number) {
  const msgs = [
    `🏆 SOY EL LÍDER en Caos Mundialista con ${points} pts! ¿Alguien me puede quitar? 🔥 caos.portelabs.com`,
    `🥈 Voy #${position} con ${points} pts en Caos Mundialista. ¡Voy por el primero! caos.portelabs.com`,
    `⚽ Estoy en el puesto #${position} con ${points} pts. ¡La batalla sigue! caos.portelabs.com`,
  ]
  const msg = position === 1 ? msgs[0] : position <= 3 ? msgs[1] : msgs[2]
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
}

export default function RankingClient({ currentUser }: { currentUser: AuthUser }) {
  const [ranking, setRanking] = useState<RankedUser[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showRules, setShowRules] = useState(false)
  const [loading, setLoading] = useState(true)
  const [live, setLive] = useState(false)
  const debounce = useRef<NodeJS.Timeout | null>(null)

  const fetchRanking = async () => {
    fetch('/api/ranking').then(r => r.json()).then(d => {
      if (Array.isArray(d)) { setRanking(d) }
      setLoading(false)
    })
  }

  const triggerRefresh = () => {
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(fetchRanking, 800)
    setLive(true)
    setTimeout(() => setLive(false), 2000)
  }

  useEffect(() => {
    fetchRanking()
    const channel = supabase
      .channel('ranking-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, triggerRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, triggerRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, triggerRefresh)
      .subscribe()
    return () => {
      if (debounce.current) clearTimeout(debounce.current)
      supabase.removeChannel(channel)
    }
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Trophy className="text-yellow-500" /> Tabla del Caos
          </h1>
          {live && (
            <span className="flex items-center gap-1.5 text-xs text-green-400 font-bold">
              <Radio size={12} className="animate-pulse" /> Actualizando...
            </span>
          )}
        </div>

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
                      isFirst ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-slate-400 text-black'
                      : i === 2 ? 'bg-amber-700 text-white' : isLast ? 'bg-red-600 text-white'
                      : 'bg-slate-700 text-slate-300'
                    }`}>{isLast ? <Frown size={14}/> : i + 1}</div>
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
                    {isMe && (
                      <button
                        onClick={e => { e.stopPropagation(); shareOnWhatsApp(user.username, i + 1, user.total_points) }}
                        className="text-[11px] bg-green-700/30 hover:bg-green-700/60 border border-green-700/40 text-green-400 px-2 py-1 rounded-lg font-bold transition-colors"
                        title="Compartir en WhatsApp">
                        💬 WA
                      </button>
                    )}
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
                    isFirst ? 'border-yellow-500/30' : isLast ? 'border-dashed border-red-500/30' : 'border-slate-700'
                  }`}>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Desglose</p>
                    {user.breakdown.length > 0 ? (
                      <ul className="space-y-1.5">
                        {user.breakdown.map((b, j) => (
                          <li key={j} className="flex justify-between text-sm">
                            <span className="text-slate-300 truncate pr-4">{b.label}</span>
                            <span className={`font-black shrink-0 ${b.points > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {b.points > 0 ? '+' : ''}{b.points}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-sm text-slate-500 italic">Sin puntos aún.</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <button onClick={() => setShowRules(!showRules)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm font-bold text-slate-300 transition-colors mb-4">
          <Skull size={15} className="text-purple-400" />
          {showRules ? 'Ocultar reglas' : 'Ver todas las reglas del Caos'}
        </button>

        {showRules && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-5">
            {RULES.map(section => (
              <div key={section.title}>
                <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider mb-3">{section.title}</h3>
                <ul className="space-y-1.5">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-slate-600 mt-0.5">•</span>
                      <span className="flex-1">
                        <span className="text-slate-200 font-semibold">{item.label}</span>
                        {item.pts && <span className="ml-2 text-orange-400 font-black">{item.pts}</span>}
                        {item.detail && <span className="ml-1 text-slate-500">— {item.detail}</span>}
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
