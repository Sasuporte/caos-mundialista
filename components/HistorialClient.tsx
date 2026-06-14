'use client'

import { useState, useEffect } from 'react'
import { Flame, Target } from 'lucide-react'
import type { AuthUser, Match, Prediction } from '@/lib/types'
import Header from './Header'

interface Entry { match: Match; prediction: Prediction }

function getResultType(pH: number, pA: number, rH: number, rA: number) {
  if (pH === 0 && pA === 0 && rH === 0 && rA === 0) return 'zero'
  if (pH === rH && pA === rA) return 'exact'
  if (pH === rA && pA === rH && pH !== pA) return 'mirror'
  if (Math.sign(pH - pA) === Math.sign(rH - rA)) return 'correct'
  return 'miss'
}

const RESULT_CONFIG = {
  zero:    { label: '0-0 🔥', color: 'text-green-300', border: 'border-green-700/40 bg-green-900/20' },
  exact:   { label: 'Exacto ✅', color: 'text-green-400', border: 'border-green-800/40 bg-green-900/10' },
  correct: { label: 'Correcto', color: 'text-blue-400',  border: 'border-blue-900/30 bg-blue-900/10' },
  mirror:  { label: 'Espejo',   color: 'text-purple-400', border: 'border-purple-800/30 bg-purple-900/10' },
  miss:    { label: 'Fallo ❌',  color: 'text-red-400',   border: 'border-slate-700/50 bg-slate-800/40 opacity-70' },
}

export default function HistorialClient({ currentUser }: { currentUser: AuthUser }) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/matches').then(r => r.json()),
      fetch('/api/predictions').then(r => r.json()),
    ]).then(([matches, preds]: [Match[], Prediction[]]) => {
      const list: Entry[] = preds
        .map(p => ({ match: matches.find(m => m.id === p.match_id)!, prediction: p }))
        .filter(e => e.match?.status === 'finished')
        .sort((a, b) => new Date(b.match.kick_off_time).getTime() - new Date(a.match.kick_off_time).getTime())
      setEntries(list)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <Flame className="text-orange-500 animate-spin" size={32} />
    </div>
  )

  // Stats
  const stats = entries.reduce((acc, { match, prediction: p }) => {
    if (match.home_score === null) return acc
    const t = getResultType(p.home_score, p.away_score, match.home_score, match.away_score!)
    acc.total++
    acc[t] = (acc[t] || 0) + 1
    acc.points += p.points_earned ?? 0
    return acc
  }, { total: 0, zero: 0, exact: 0, correct: 0, mirror: 0, miss: 0, points: 0 } as Record<string, number>)

  const pct = stats.total > 0 ? Math.round(((stats.exact + stats.correct + stats.zero) / stats.total) * 100) : 0

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 pb-20">
      <Header currentUser={currentUser} activeTab="historial" />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <h1 className="text-2xl font-black flex items-center gap-2">
          <Target className="text-orange-400" /> Mis Predicciones
        </h1>

        {/* Stats summary */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="text-center">
              <p className="text-3xl font-black text-white">{stats.total}</p>
              <p className="text-xs text-slate-500 mt-1">Apostados</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black text-orange-400">+{stats.points}</p>
              <p className="text-xs text-slate-500 mt-1">Puntos</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black text-white">{pct}%</p>
              <p className="text-xs text-slate-500 mt-1">Precisión</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Exactos', val: stats.exact + stats.zero, color: 'text-green-400', bg: 'bg-green-900/20 border-green-800/40' },
              { label: 'Correctos', val: stats.correct, color: 'text-blue-400', bg: 'bg-blue-900/20 border-blue-800/40' },
              { label: 'Espejos', val: stats.mirror, color: 'text-purple-400', bg: 'bg-purple-900/20 border-purple-800/40' },
              { label: 'Fallos', val: stats.miss, color: 'text-red-400', bg: 'bg-red-900/20 border-red-800/40' },
            ].map(s => (
              <div key={s.label} className={`border rounded-xl p-3 text-center ${s.bg}`}>
                <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* History list */}
        {entries.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Target size={40} className="mx-auto mb-3 opacity-30" />
            <p>No has apostado en ningún partido finalizado aún.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map(({ match, prediction: p }) => {
              const rH = match.home_score!
              const rA = match.away_score!
              const type = getResultType(p.home_score, p.away_score, rH, rA)
              const cfg = RESULT_CONFIG[type]
              const pts = p.points_earned ?? 0
              return (
                <div key={match.id} className={`flex items-center justify-between p-3 rounded-xl border ${cfg.border}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {match.home_team} vs {match.away_team}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      <span className="text-slate-400 font-mono">Real: {rH}-{rA}</span>
                      <span className="mx-2">·</span>
                      <span className="font-mono">Apuesta: {p.home_score}-{p.away_score}</span>
                      {p.is_joker && <span className="ml-1 text-yellow-400">⚡</span>}
                    </p>
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <p className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</p>
                    <p className={`font-black text-sm ${
                      pts > 0 ? 'text-green-400' : pts < 0 ? 'text-red-400' : 'text-slate-500'
                    }`}>{pts > 0 ? '+' : ''}{pts} pts</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
