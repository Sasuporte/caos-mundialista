'use client'

import { useState, useEffect } from 'react'
import { Flame, RefreshCw } from 'lucide-react'
import type { AuthUser, Match } from '@/lib/types'
import Header from './Header'

export default function AdminClient({ currentUser }: { currentUser: AuthUser }) {
  const [matches, setMatches] = useState<Match[]>([])
  const [scores, setScores] = useState<Record<string, { home: string; away: string }>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [newMatch, setNewMatch] = useState({
    home_team: '', away_team: '', phase: 'grupos', matchday: 1,
    kick_off_time: '', status: 'pending'
  })

  const loadMatches = async () => {
    const data: Match[] = await fetch('/api/matches').then(r => r.json())
    setMatches(data)
    const s: Record<string, { home: string; away: string }> = {}
    data.forEach(m => { s[m.id] = { home: String(m.home_score ?? ''), away: String(m.away_score ?? '') } })
    setScores(s)
    setLoading(false)
  }

  useEffect(() => { loadMatches() }, [])

  const syncFromApi = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/admin/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setSyncResult(`❌ ${data.error}`)
      } else {
        setSyncResult(`✅ ${data.total} partidos — ${data.synced} nuevos, ${data.updated} actualizados`)
        await loadMatches()
      }
    } catch (e) {
      setSyncResult('❌ Error de red. Verifica tu API key.')
    } finally {
      setSyncing(false)
    }
  }

  const updateScore = async (matchId: string) => {
    const s = scores[matchId]
    if (!s || s.home === '' || s.away === '') return
    setSaving(matchId)
    await fetch('/api/admin/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: matchId, home_score: Number(s.home), away_score: Number(s.away) }),
    })
    await loadMatches()
    setSaving(null)
  }

  const createMatch = async () => {
    if (!newMatch.home_team || !newMatch.away_team || !newMatch.kick_off_time) return
    await fetch('/api/admin/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newMatch, kick_off_time: new Date(newMatch.kick_off_time).toISOString() }),
    })
    await loadMatches()
    setNewMatch({ home_team: '', away_team: '', phase: 'grupos', matchday: 1, kick_off_time: '', status: 'pending' })
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <Flame className="text-orange-500 animate-spin" size={32} />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 pb-20">
      <Header currentUser={currentUser} activeTab="admin" />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        <h1 className="text-2xl font-black">⚙️ Panel de Administración</h1>

        {/* Sync from API */}
        <section className="bg-gradient-to-br from-blue-900/30 to-slate-800 border border-blue-500/30 rounded-xl p-5">
          <h2 className="text-sm font-bold text-blue-300 uppercase tracking-wider mb-3">🔄 Sincronizar desde API-Football</h2>
          <p className="text-xs text-slate-400 mb-4">
            Importa automáticamente todos los partidos del Mundial 2026 (resultados, horarios, fases). 
            Requiere <code className="bg-slate-700 px-1 rounded">API_FOOTBALL_KEY</code> en variables de entorno de Vercel.
          </p>
          <button onClick={syncFromApi} disabled={syncing}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm disabled:opacity-50 transition-colors">
            <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
          </button>
          {syncResult && (
            <p className="mt-3 text-sm text-slate-300 bg-slate-700/50 px-3 py-2 rounded-lg">{syncResult}</p>
          )}
          <p className="mt-3 text-xs text-slate-500">
            ⏰ Sincronización automática cada hora vía Vercel Cron (requiere plan Pro). 
            Alternativa gratis: usa <a href="https://cron-job.org" className="text-blue-400 underline" target="_blank">cron-job.org</a> apuntando a <code className="bg-slate-700 px-1 rounded">/api/admin/sync?secret=TU_SYNC_SECRET</code>
          </p>
        </section>

        {/* Manual match creation */}
        <section className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Agregar Partido Manualmente</h2>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Local" value={newMatch.home_team}
              onChange={e => setNewMatch(p => ({ ...p, home_team: e.target.value }))}
              className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" />
            <input placeholder="Visitante" value={newMatch.away_team}
              onChange={e => setNewMatch(p => ({ ...p, away_team: e.target.value }))}
              className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" />
            <select value={newMatch.phase}
              onChange={e => setNewMatch(p => ({ ...p, phase: e.target.value }))}
              className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
              {['grupos','octavos','cuartos','semis','final'].map(ph => (
                <option key={ph} value={ph}>{ph}</option>
              ))}
            </select>
            <input type="number" placeholder="Jornada" value={newMatch.matchday}
              onChange={e => setNewMatch(p => ({ ...p, matchday: Number(e.target.value) }))}
              className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
            <input type="datetime-local" value={newMatch.kick_off_time}
              onChange={e => setNewMatch(p => ({ ...p, kick_off_time: e.target.value }))}
              className="col-span-2 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
          </div>
          <button onClick={createMatch}
            className="mt-3 w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 rounded-lg text-sm">
            + Agregar Partido
          </button>
        </section>

        {/* Update scores */}
        <section>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Resultados ({matches.length} partidos)</h2>
          <div className="space-y-2">
            {matches.map(match => (
              <div key={match.id} className={`bg-slate-800 border rounded-xl p-3 flex flex-wrap items-center gap-2 ${
                match.status === 'finished' ? 'border-green-900/40' :
                match.status === 'live' ? 'border-red-500/40' :
                'border-slate-700'
              }`}>
                <div className="flex-1 text-sm min-w-0">
                  <span className="font-bold">{match.home_team} vs {match.away_team}</span>
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                    match.status === 'finished' ? 'bg-green-900/50 text-green-400' :
                    match.status === 'live' ? 'bg-red-900/50 text-red-400 animate-pulse' :
                    'bg-slate-700 text-slate-400'
                  }`}>{match.phase} • {match.status}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input type="number" min={0} max={20} value={scores[match.id]?.home ?? ''}
                    onChange={e => setScores(s => ({ ...s, [match.id]: { ...s[match.id], home: e.target.value } }))}
                    className="w-10 h-9 text-center font-black bg-slate-900 border border-slate-600 rounded-lg focus:outline-none focus:border-orange-500 text-white text-sm" />
                  <span className="text-slate-500">-</span>
                  <input type="number" min={0} max={20} value={scores[match.id]?.away ?? ''}
                    onChange={e => setScores(s => ({ ...s, [match.id]: { ...s[match.id], away: e.target.value } }))}
                    className="w-10 h-9 text-center font-black bg-slate-900 border border-slate-600 rounded-lg focus:outline-none focus:border-orange-500 text-white text-sm" />
                  <button onClick={() => updateScore(match.id)} disabled={saving === match.id}
                    className="px-3 py-2 bg-green-700 hover:bg-green-600 text-white text-xs font-bold rounded-lg disabled:opacity-50">
                    {saving === match.id ? '...' : '✓'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
