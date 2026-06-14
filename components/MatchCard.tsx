'use client'

import { useState } from 'react'
import { ShieldAlert, Zap, Skull } from 'lucide-react'
import type { Match, Prediction } from '@/lib/types'
import CountdownTimer from './CountdownTimer'

const PHASE_LABEL: Record<string, string> = {
  grupos: 'Grupos', octavos: 'Octavos', cuartos: 'Cuartos ×2',
  semis: 'Semi ×2', final: 'Final ×2',
}

function isLocked(match: Match): boolean {
  if (match.status === 'finished') return true
  return Date.now() >= new Date(match.kick_off_time).getTime() - 15 * 60 * 1000
}

interface Props {
  match: Match
  prediction?: Prediction
  isJoker: boolean
  onSave: (matchId: string, home: number, away: number, joker: boolean) => Promise<void>
  trapCardMatchId?: string | null
  hasUsedTrapCard: boolean
  isLeader: boolean
  leaderName?: string
  onTrapCard: (matchId: string) => Promise<void>
}

export default function MatchCard({
  match, prediction, isJoker, onSave,
  trapCardMatchId, hasUsedTrapCard, isLeader, leaderName, onTrapCard
}: Props) {
  const locked = isLocked(match)
  const [localHome, setLocalHome] = useState(prediction?.home_score != null ? String(prediction.home_score) : '')
  const [localAway, setLocalAway] = useState(prediction?.away_score != null ? String(prediction.away_score) : '')
  const [saving, setSaving] = useState(false)
  const [trapping, setTrapping] = useState(false)

  const save = async (joker?: boolean) => {
    if (locked || localHome === '' || localAway === '') return
    setSaving(true)
    await onSave(match.id, Number(localHome), Number(localAway), joker ?? isJoker)
    setSaving(false)
  }

  const handleTrapCard = async () => {
    const target = leaderName ?? 'el líder'
    if (!window.confirm(`¿Activar Carta Trampa en ${match.home_team} vs ${match.away_team}?\n\nSi aciertas el marcador exacto aquí, robas el 20% de los puntos de ${target}.`)) return
    setTrapping(true)
    await onTrapCard(match.id)
    setTrapping(false)
  }

  const isHighPhase = ['cuartos', 'semis', 'final'].includes(match.phase)
  const isTrapActive = trapCardMatchId === match.id
  const canShowTrap = !locked && !isLeader && match.status === 'pending'

  return (
    <div className={`bg-slate-800 rounded-2xl p-5 border transition-all ${
      locked ? 'border-red-900/30 opacity-90' : 'border-slate-700 hover:border-slate-500'
    }${isJoker ? ' ring-1 ring-yellow-500/40' : ''}${
      isTrapActive ? ' ring-2 ring-purple-500/60 shadow-[0_0_16px_rgba(168,85,247,0.2)]' : ''
    }`}>

      <div className="flex justify-between items-center mb-3">
        <span className={`text-xs font-bold uppercase tracking-wider ${
          isHighPhase ? 'text-orange-400' : 'text-slate-500'
        }`}>{PHASE_LABEL[match.phase] ?? match.phase}</span>
        {match.status === 'finished' ? (
          <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded">Finalizado</span>
        ) : match.status === 'live' ? (
          <span className="flex items-center gap-1 text-xs font-bold text-red-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> En juego
          </span>
        ) : locked ? (
          <span className="flex items-center gap-1 text-red-400 text-xs font-bold"><ShieldAlert size={11}/> Bloqueado</span>
        ) : (
          <CountdownTimer kickOff={match.kick_off_time} />
        )}
      </div>

      <div className="flex justify-between items-center gap-2 mb-3">
        <p className="flex-1 text-center text-sm font-bold leading-tight">{match.home_team}</p>
        <div className="flex items-center gap-1 shrink-0">
          <input type="number" min={0} max={20}
            value={match.status === 'finished' ? (match.home_score ?? '') : localHome}
            onChange={e => setLocalHome(e.target.value)}
            onBlur={() => save()}
            disabled={locked || saving}
            className={`w-12 h-12 text-center text-xl font-black rounded-xl bg-slate-900 border focus:outline-none ${
              locked ? 'border-slate-700 text-slate-500 cursor-not-allowed' : 'border-slate-600 focus:border-orange-500 text-white'
            }`}
          />
          <span className="text-slate-600 font-bold px-0.5">-</span>
          <input type="number" min={0} max={20}
            value={match.status === 'finished' ? (match.away_score ?? '') : localAway}
            onChange={e => setLocalAway(e.target.value)}
            onBlur={() => save()}
            disabled={locked || saving}
            className={`w-12 h-12 text-center text-xl font-black rounded-xl bg-slate-900 border focus:outline-none ${
              locked ? 'border-slate-700 text-slate-500 cursor-not-allowed' : 'border-slate-600 focus:border-orange-500 text-white'
            }`}
          />
        </div>
        <p className="flex-1 text-center text-sm font-bold leading-tight">{match.away_team}</p>
      </div>

      {match.status === 'finished' && prediction && (
        <div className="text-center text-xs border-t border-slate-700 pt-2 mt-2">
          <span className="text-slate-400">Tu apuesta: </span>
          <span className="text-white font-bold">{prediction.home_score}-{prediction.away_score}</span>
          {prediction.points_earned != null && (
            <span className={`ml-2 font-black ${
              prediction.points_earned > 0 ? 'text-green-400' : prediction.points_earned < 0 ? 'text-red-400' : 'text-slate-500'
            }`}>{prediction.points_earned > 0 ? '+' : ''}{prediction.points_earned} pts</span>
          )}
        </div>
      )}

      {isTrapActive && !locked && (
        <div className="mt-3 pt-3 border-t border-purple-700/30 flex items-center gap-2 text-xs text-purple-300">
          <Skull size={12} />
          <span>Carta Trampa activa vs <strong>{leaderName ?? 'el líder'}</strong> — aciertas exacto y robas el 20%</span>
        </div>
      )}

      {!locked && (
        <div className={`mt-3 pt-3 border-t border-slate-700 flex gap-2 ${isTrapActive ? 'hidden' : ''}`}>
          <button
            onClick={() => save(!isJoker)}
            disabled={saving || localHome === '' || localAway === ''}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all disabled:opacity-40 ${
              isJoker ? 'bg-yellow-500 text-black shadow-[0_0_14px_rgba(234,179,8,0.35)]' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}>
            <Zap size={13}/> Comodín {isJoker ? '(Activo)' : 'x2'}
          </button>

          {canShowTrap && !hasUsedTrapCard && (
            <button
              onClick={handleTrapCard}
              disabled={trapping}
              className="flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 bg-slate-700 text-slate-300 hover:bg-purple-700 hover:text-white transition-all disabled:opacity-50">
              <Skull size={13}/> Trampa al líder
            </button>
          )}
        </div>
      )}
    </div>
  )
}
