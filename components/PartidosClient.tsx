'use client'

import { useState, useEffect, useCallback } from 'react'
import { Flame, Radio } from 'lucide-react'
import Link from 'next/link'
import type { AuthUser, Match, Prediction } from '@/lib/types'
import Header from './Header'
import MatchCard from './MatchCard'

function getActiveMatchday(matches: Match[]): number | null {
  // 1. Matchday with any live match
  const live = matches.find(m => m.status === 'live')
  if (live) return live.matchday

  // 2. Matchday with the most recently finished match
  const finished = [...matches]
    .filter(m => m.status === 'finished')
    .sort((a, b) => new Date(b.kick_off_time).getTime() - new Date(a.kick_off_time).getTime())
  if (finished.length > 0) return finished[0].matchday

  // 3. Matchday with the next upcoming match
  const upcoming = [...matches]
    .filter(m => m.status === 'pending')
    .sort((a, b) => new Date(a.kick_off_time).getTime() - new Date(b.kick_off_time).getTime())
  if (upcoming.length > 0) return upcoming[0].matchday

  return null
}

export default function PartidosClient({ currentUser }: { currentUser: AuthUser }) {
  const [matches, setMatches] = useState<Match[]>([])
  const [predMap, setPredMap] = useState<Record<string, Prediction>>({})
  const [jokers, setJokers] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [openDays, setOpenDays] = useState<Set<number>>(new Set())

  const loadData = useCallback(async () => {
    const [mRes, pRes] = await Promise.all([fetch('/api/matches'), fetch('/api/predictions')])
    const mData: Match[] = await mRes.json()
    const pData: Prediction[] = await pRes.json()
    setMatches(mData)

    const pm: Record<string, Prediction> = {}
    const jk: Record<number, string> = {}
    pData.forEach(p => {
      pm[p.match_id] = p
      if (p.is_joker) {
        const m = mData.find(m => m.id === p.match_id)
        if (m) jk[m.matchday] = p.match_id
      }
    })
    setPredMap(pm)
    setJokers(jk)

    // Auto-open active matchday
    const active = getActiveMatchday(mData)
    if (active !== null) setOpenDays(new Set([active]))

    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleSave = async (matchId: string, home: number, away: number, isJoker: boolean) => {
    await fetch('/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: matchId, home_score: home, away_score: away, is_joker: isJoker }),
    })
    await loadData()
  }

  const toggleDay = (day: number) => {
    setOpenDays(prev => {
      const next = new Set(prev)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <Flame className="text-orange-500 animate-spin" size={32} />
    </div>
  )

  if (matches.length === 0) return (
    <div className="min-h-screen bg-slate-900 text-slate-200 pb-20">
      <Header currentUser={currentUser} activeTab="partidos" />
      <div className="text-center py-24 text-slate-500">
        <p className="text-5xl mb-4">⚽</p>
        <p className="mb-2">No hay partidos cargados.</p>
        {currentUser.is_admin && (
          <Link href="/admin" className="text-orange-400 hover:text-orange-300 text-sm">→ Ir al panel de admin</Link>
        )}
      </div>
    </div>
  )

  const days = Array.from(new Set(matches.map(m => m.matchday))).sort((a, b) => a - b)
  const liveMatches = matches.filter(m => m.status === 'live')
  const recentFinished = [...matches]
    .filter(m => m.status === 'finished')
    .sort((a, b) => new Date(b.kick_off_time).getTime() - new Date(a.kick_off_time).getTime())
    .slice(0, 1)

  const highlightedMatches = liveMatches.length > 0 ? liveMatches : recentFinished

  const PHASE_LABEL: Record<string, string> = {
    grupos: 'Grupos', octavos: 'Octavos', cuartos: 'Cuartos ×2',
    semis: 'Semi ×2', final: 'Final ×2',
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 pb-20">
      <Header currentUser={currentUser} activeTab="partidos" />
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* LIVE / RECIENTE */}
        {highlightedMatches.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              {liveMatches.length > 0 ? (
                <>
                  <Radio size={14} className="text-red-400 animate-pulse" />
                  <span className="text-xs font-black text-red-400 uppercase tracking-widest">En juego ahora</span>
                </>
              ) : (
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">⏰ Último resultado</span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {highlightedMatches.map(match => (
                <div key={match.id} className={`rounded-2xl ${
                  liveMatches.length > 0 ? 'ring-2 ring-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]' : ''
                }`}>
                  <MatchCard
                    match={match}
                    prediction={predMap[match.id]}
                    isJoker={jokers[match.matchday] === match.id}
                    onSave={handleSave}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ACORDEÓN POR JORNADA */}
        <section className="space-y-2">
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Todas las jornadas</p>
          {days.map(day => {
            const dayMatches = matches.filter(m => m.matchday === day)
            const isOpen = openDays.has(day)
            const finished = dayMatches.filter(m => m.status === 'finished').length
            const live = dayMatches.filter(m => m.status === 'live').length
            const pending = dayMatches.filter(m => m.status === 'pending').length
            const predicted = dayMatches.filter(m => predMap[m.id]).length
            const phase = PHASE_LABEL[dayMatches[0]?.phase] ?? dayMatches[0]?.phase ?? ''

            return (
              <div key={day} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                {/* Accordion header */}
                <button
                  onClick={() => toggleDay(day)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-black text-white">Jornada {day}</span>
                    <span className="text-xs text-slate-500">{phase}</span>
                    {live > 0 && (
                      <span className="flex items-center gap-1 text-xs font-bold text-red-400">
                        <Radio size={10} className="animate-pulse" /> {live} en juego
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{predicted}/{dayMatches.length} apostado</span>
                    <span className={`w-2 h-2 rounded-full ${
                      live > 0 ? 'bg-red-400 animate-pulse' :
                      finished === dayMatches.length ? 'bg-green-500' :
                      pending === dayMatches.length ? 'bg-slate-600' :
                      'bg-orange-400'
                    }`} />
                    <span className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                  </div>
                </button>

                {/* Accordion content */}
                {isOpen && (
                  <div className="p-4 pt-2 border-t border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dayMatches
                      .sort((a, b) => new Date(a.kick_off_time).getTime() - new Date(b.kick_off_time).getTime())
                      .map(match => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          prediction={predMap[match.id]}
                          isJoker={jokers[match.matchday] === match.id}
                          onSave={handleSave}
                        />
                      ))}
                  </div>
                )}
              </div>
            )
          })}
        </section>
      </main>
    </div>
  )
}
