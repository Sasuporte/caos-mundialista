'use client'

import { useState, useEffect, useCallback } from 'react'
import { Flame } from 'lucide-react'
import Link from 'next/link'
import type { AuthUser, Match, Prediction } from '@/lib/types'
import Header from './Header'
import MatchCard from './MatchCard'

export default function PartidosClient({ currentUser }: { currentUser: AuthUser }) {
  const [matches, setMatches] = useState<Match[]>([])
  const [predMap, setPredMap] = useState<Record<string, Prediction>>({})
  const [jokers, setJokers] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)

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

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <Flame className="text-orange-500 animate-spin" size={32} />
    </div>
  )

  const days = Array.from(new Set(matches.map(m => m.matchday))).sort((a, b) => a - b)

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 pb-20">
      <Header currentUser={currentUser} activeTab="partidos" />
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {days.map(day => (
          <section key={day}>
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Jornada {day}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matches.filter(m => m.matchday === day).map(match => (
                <MatchCard
                  key={match.id}
                  match={match}
                  prediction={predMap[match.id]}
                  isJoker={jokers[match.matchday] === match.id}
                  onSave={handleSave}
                />
              ))}
            </div>
          </section>
        ))}
        {matches.length === 0 && (
          <div className="text-center py-24 text-slate-500">
            <p className="text-5xl mb-4">⚽</p>
            <p className="mb-2">No hay partidos cargados.</p>
            {currentUser.is_admin && (
              <Link href="/admin" className="text-orange-400 hover:text-orange-300 text-sm">→ Ir al panel de admin</Link>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
