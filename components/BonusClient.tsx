'use client'

import { useState, useEffect } from 'react'
import { Flame } from 'lucide-react'
import type { AuthUser, LongTermBet } from '@/lib/types'
import Header from './Header'

const FIELDS = [
  { key: 'champion', label: '🏆 Campeón del Mundo', pts: 50, hint: 'Ej: Argentina' },
  { key: 'runner_up', label: '🥈 Subcampeón', pts: 30, hint: 'Ej: Francia' },
  { key: 'third_place', label: '🥉 Tercer Lugar', pts: 20, hint: 'Ej: Brasil' },
  { key: 'top_scorer', label: '👟 Bota de Oro', pts: 40, hint: 'Ej: Mbappé' },
  { key: 'revelation_team', label: '⭐ Equipo Revelación', pts: 25, hint: 'Top >15 FIFA que llegue más lejos' },
  { key: 'disappointment_team', label: '💀 Decepcón del Torneo', pts: 25, hint: 'Top 10 FIFA eliminado en grupos' },
] as const

export default function BonusClient({ currentUser }: { currentUser: AuthUser }) {
  const [bet, setBet] = useState<Partial<Record<string, string>>>({})
  const [locked, setLocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/long-term-bets').then(r => r.json()),
      fetch('/api/matches').then(r => r.json()),
    ]).then(([betData, matches]) => {
      if (betData) {
        const fields = ['champion','runner_up','third_place','top_scorer','revelation_team','disappointment_team']
        const b: Record<string, string> = {}
        fields.forEach(f => { if (betData[f]) b[f] = betData[f] })
        setBet(b)
      }
      if (Array.isArray(matches) && matches.length > 0) {
        const first = [...matches].sort((a: any, b: any) =>
          new Date(a.kick_off_time).getTime() - new Date(b.kick_off_time).getTime()
        )[0]
        setLocked(Date.now() >= new Date(first.kick_off_time).getTime() - 15 * 60 * 1000)
      }
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    await fetch('/api/long-term-bets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bet),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <Flame className="text-orange-500 animate-spin" size={32} />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 pb-20">
      <Header currentUser={currentUser} activeTab="bonus" />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-gradient-to-br from-purple-900/30 to-slate-800 rounded-2xl border border-purple-500/30 p-6">
          <h1 className="text-2xl font-black text-purple-300 mb-1">Predicciones de Largo Plazo</h1>
          <p className="text-sm text-slate-400 mb-6">
            {locked ? '🔒 Bloqueadas — el torneo ya comenzó.'
            : 'Se bloquean 15 min antes del primer partido. Puntos masivos te esperan.'}
          </p>
          <div className="space-y-4">
            {FIELDS.map(({ key, label, pts, hint }) => (
              <div key={key}>
                <label className="flex justify-between text-sm font-bold text-slate-300 mb-1">
                  <span>{label}</span>
                  <span className="text-purple-400">+{pts} pts</span>
                </label>
                <input type="text" value={bet[key] ?? ''}
                  onChange={e => setBet(prev => ({ ...prev, [key]: e.target.value }))}
                  disabled={locked}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 disabled:opacity-50"
                  placeholder={hint}
                />
              </div>
            ))}
          </div>
          {!locked && (
            <button onClick={handleSave} disabled={saving}
              className="w-full mt-6 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
              {saved ? '✓ Guardado' : saving ? 'Guardando...' : 'Guardar Apuestas'}
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
