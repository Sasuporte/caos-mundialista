'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Flame, Radio, AlertCircle, Trophy, ChevronDown, ChevronUp, Frown } from 'lucide-react'
import Link from 'next/link'
import type { AuthUser, Match, Prediction } from '@/lib/types'
import Header from './Header'
import MatchCard from './MatchCard'

interface TrapCardStatus {
  id: string
  match_id: string
  target_id: string
  triggered: boolean
}

interface RankedUser {
  id: string
  username: string
  total_points: number
  is_in_survival_mode?: boolean
}

function getActiveMatchday(matches: Match[]): number | null {
  const live = matches.find(m => m.status === 'live')
  if (live) return live.matchday
  const finished = [...matches].filter(m => m.status === 'finished')
    .sort((a, b) => new Date(b.kick_off_time).getTime() - new Date(a.kick_off_time).getTime())
  if (finished.length > 0) return finished[0].matchday
  const upcoming = [...matches].filter(m => m.status === 'pending')
    .sort((a, b) => new Date(a.kick_off_time).getTime() - new Date(b.kick_off_time).getTime())
  if (upcoming.length > 0) return upcoming[0].matchday
  return null
}

const PHASE_LABEL: Record<string, string> = {
  grupos: 'Grupos', octavos: 'Octavos', cuartos: 'Cuartos x2',
  semis: 'Semi x2', final: 'Final x2',
}

function MiniRanking({ ranking, currentUserId }: { ranking: RankedUser[]; currentUserId: string }) {
  const [open, setOpen] = useState(false)
  const myIndex = ranking.findIndex(u => u.id === currentUserId)
  const myUser = ranking[myIndex]

  const badgeColor = (i: number, isLast: boolean): string => {
    if (i === 0) return 'bg-yellow-500 text-black'
    if (i === 1) return 'bg-slate-400 text-black'
    if (i === 2) return 'bg-amber-700 text-white'
    if (isLast) return 'bg-red-600 text-white'
    return 'bg-slate-700 text-slate-300'
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Trophy size={14} className="text-yellow-500" />
          <span className="text-sm font-black text-white">Tabla del Caos</span>
          {myUser && (
            <span className="text-xs text-slate-400">
              &mdash; vas <span className="text-white font-bold">#{myIndex + 1}</span> con{' '}
              <span className="text-green-400 font-bold">{myUser.total_points} pts</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>ver completo</span>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-700">
          {ranking.map((user, i) => {
            const isLast = i === ranking.length - 1 && ranking.length > 1
            const isMe = user.id === currentUserId
            return (
              <Link
                key={user.id}
                href="/ranking"
                className={[
                  'flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700/40 transition-colors border-b border-slate-700/50 last:border-0',
                  isMe ? 'bg-slate-700/30' : '',
                ].join(' ')}
              >
                <div className={['w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0', badgeColor(i, isLast)].join(' ')}>
                  {isLast ? <Frown size={12} /> : i + 1}
                </div>
                <span className={['flex-1 text-sm font-bold', isLast ? 'text-red-400' : 'text-white'].join(' ')}>
                  {user.username}
                  {isMe && <span className="ml-1.5 text-[10px] bg-orange-600 text-white px-1.5 py-0.5 rounded font-normal">Tu</span>}
                  {user.is_in_survival_mode && <span className="ml-1.5 text-[10px] text-red-400 border border-red-500/40 px-1 rounded">Supervivencia</span>}
                </span>
                <span className={['text-sm font-black shrink-0', i === 0 ? 'text-yellow-300' : isLast ? 'text-red-400' : 'text-white'].join(' ')}>
                  {user.total_points} <span className="text-[10px] text-slate-500 font-normal">pts</span>
                </span>
                <ChevronDown size={12} className="text-slate-600 -rotate-90" />
              </Link>
            )
          })}
          <Link href="/ranking" className="flex items-center justify-center py-2.5 text-xs text-orange-400 hover:text-orange-300 transition-colors font-bold">
            Ver desglose completo &rarr;
          </Link>
        </div>
      )}
    </div>
  )
}

export default function PartidosClient({ currentUser }: { currentUser: AuthUser }) {
  const [matches, setMatches] = useState<Match[]>([])
  const [predMap, setPredMap] = useState<Record<string, Prediction>>({})
  const [jokers, setJokers] = useState<Record<number, string>>({})
  const [trapCard, setTrapCard] = useState<TrapCardStatus | null>(null)
  const [ranking, setRanking] = useState<RankedUser[]>([])
  const [leader, setLeader] = useState<RankedUser | null>(null)
  const [isCurrentUserLeader, setIsCurrentUserLeader] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [openDays, setOpenDays] = useState<Set<number>>(new Set())
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [mRes, pRes, tcRes, rankRes] = await Promise.all([
        fetch('/api/matches'),
        fetch('/api/predictions'),
        fetch('/api/trap-cards'),
        fetch('/api/ranking'),
      ])
      if (!mRes.ok || !pRes.ok) throw new Error('Error al cargar los partidos')
      const mData: Match[] = await mRes.json()
      const pData: Prediction[] = await pRes.json()
      const tcData = await tcRes.json()
      const rankData: RankedUser[] = rankRes.ok ? await rankRes.json() : []
      setMatches(mData)
      setTrapCard(tcData)
      setRanking(rankData)
      setLoadError(null)
      const myRank = rankData.findIndex(u => u.id === currentUser.id)
      setIsCurrentUserLeader(myRank === 0)
      setLeader(myRank === 0 ? (rankData[1] ?? null) : (rankData[0] ?? null))
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
      if (!silent) {
        const active = getActiveMatchday(mData)
        if (active !== null) setOpenDays(new Set([active]))
      }
      const hasLive = mData.some(m => m.status === 'live')
      if (hasLive && !intervalRef.current) {
        intervalRef.current = setInterval(() => loadData(true), 60000)
      } else if (!hasLive && intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    } catch (err) {
      console.error('[PartidosClient] loadData error:', err)
      if (!silent) setLoadError('No se pudieron cargar los partidos. Intenta recargar la pagina.')
    } finally {
      setLoading(false)
    }
  }, [currentUser.id])

  useEffect(() => {
    loadData()
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [loadData])

  const handleSave = async (matchId: string, home: number, away: number, isJoker: boolean) => {
    await fetch('/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: matchId, home_score: home, away_score: away, is_joker: isJoker }),
    })
    await loadData(true)
  }

  const handleTrapCard = async (matchId: string) => {
    const res = await fetch('/api/trap-cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: matchId }),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error); return }
    setTrapCard(data)
  }

  const toggleDay = (day: number) => {
    setOpenDays(prev => {
      const next = new Set(prev)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }

  const pendingCount = matches.filter(m => {
    if (m.status !== 'pending') return false
    const hoursUntil = (new Date(m.kick_off_time).getTime() - Date.now()) / 3600000
    return hoursUntil > 0 && hoursUntil <= 48 && !predMap[m.id]
  }).length

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <Flame className="text-orange-500 animate-spin" size={32} />
    </div>
  )

  if (loadError) return (
    <div className="min-h-screen bg-slate-900 text-slate-200 pb-20">
      <Header currentUser={currentUser} activeTab="partidos" />
      <div className="text-center py-24 text-slate-500">
        <p className="text-4xl mb-4">warning</p>
        <p className="text-slate-400 mb-4">{loadError}</p>
        <button onClick={() => loadData()} className="text-sm text-orange-400 hover:text-orange-300 border border-orange-500/30 px-4 py-2 rounded-lg">Reintentar</button>
      </div>
    </div>
  )

  if (matches.length === 0) return (
    <div className="min-h-screen bg-slate-900 text-slate-200 pb-20">
      <Header currentUser={currentUser} activeTab="partidos" />
      <div className="text-center py-24 text-slate-500">
        <p className="text-5xl mb-4">soccer</p>
        <p className="mb-2">No hay partidos cargados.</p>
        {currentUser.is_admin && <Link href="/admin" className="text-orange-400 hover:text-orange-300 text-sm">Ir al panel de admin</Link>}
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
  const matchCardProps = {
    hasUsedTrapCard: !!trapCard,
    isLeader: isCurrentUserLeader,
    leaderName: leader?.username,
    onTrapCard: handleTrapCard,
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 pb-20">
      <Header currentUser={currentUser} activeTab="partidos" />

      {pendingCount > 0 && (
        <div className="max-w-5xl mx-auto px-4 pt-4">
          <div className="flex items-center gap-2 bg-orange-950/40 border border-orange-500/30 rounded-xl px-4 py-2.5 text-sm">
            <AlertCircle size={15} className="text-orange-400 shrink-0" />
            <span className="text-orange-300">
              Tienes <strong>{pendingCount} partido{pendingCount > 1 ? 's' : ''}</strong> en las proximas 48h sin prediccion.
            </span>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {ranking.length > 0 && <MiniRanking ranking={ranking} currentUserId={currentUser.id} />}

        {highlightedMatches.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              {liveMatches.length > 0 ? (
                <><Radio size={14} className="text-red-400 animate-pulse" />
                  <span className="text-xs font-black text-red-400 uppercase tracking-widest">En juego ahora</span>
                  <span className="text-xs text-slate-500">se actualiza cada 60 seg</span>
                </>
              ) : (
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Ultimo resultado</span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {highlightedMatches.map(match => (
                <div key={match.id} className={liveMatches.length > 0 ? 'ring-2 ring-red-500/50 rounded-2xl' : ''}>
                  <MatchCard match={match} prediction={predMap[match.id]}
                    isJoker={jokers[match.matchday] === match.id}
                    onSave={handleSave}
                    trapCardMatchId={trapCard?.match_id}
                    {...matchCardProps}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

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
                <button onClick={() => toggleDay(day)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/50 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-white">Jornada {day}</span>
                    <span className="text-xs text-slate-500">{phase}</span>
                    {live > 0 && <span className="flex items-center gap-1 text-xs font-bold text-red-400"><Radio size={10} className="animate-pulse" /> {live} en juego</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className={predicted === dayMatches.length ? 'text-green-400' : predicted > 0 ? 'text-orange-400' : ''}>
                      {predicted}/{dayMatches.length} apostado
                    </span>
                    <span className={[
                      'w-2 h-2 rounded-full',
                      live > 0 ? 'bg-red-400 animate-pulse' :
                      finished === dayMatches.length ? 'bg-green-500' :
                      pending === dayMatches.length ? 'bg-slate-600' : 'bg-orange-400'
                    ].join(' ')} />
                    <span className={['transition-transform duration-200', isOpen ? 'rotate-180' : ''].join(' ')}>&#9662;</span>
                  </div>
                </button>
                {isOpen && (
                  <div className="p-4 pt-2 border-t border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dayMatches
                      .sort((a, b) => new Date(a.kick_off_time).getTime() - new Date(b.kick_off_time).getTime())
                      .map(match => (
                        <MatchCard key={match.id} match={match}
                          prediction={predMap[match.id]}
                          isJoker={jokers[match.matchday] === match.id}
                          onSave={handleSave}
                          trapCardMatchId={trapCard?.match_id}
                          {...matchCardProps}
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
