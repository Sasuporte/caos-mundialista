'use client'

import { useState } from 'react'
import { ShieldAlert, Zap } from 'lucide-react'
import type { Match, Prediction } from '@/lib/types'
import CountdownTimer from './CountdownTimer'

const PHASE_LABEL: Record<string, string> = {
  grupos: 'Grupos',
  octavos: 'Octavos',
  cuartos: 'Cuartos ×2',
  semis: 'Semi ×2',
  final: 'Final ×2',
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
}

export default function MatchCard({ match, prediction, isJoker, onSave }: Props) {
  const locked = isLocked(match)
  const [localHome, setLocalHome] = useState(prediction?.home_score != null ? String(prediction.home_score) : '')
  const [localAway, setLocalAway] = useState(prediction?.away_score != null ? String(prediction.away_score) : '')
  const [saving, setSaving] = useState(false)

  const save = async (joker?: boolean) => {
    if (locked || localHome === '' || localAway === '') return
    setSaving(true)
    await onSave(match.id, Number(localHome), Number(localAway), joker ?? isJoker)
    setSaving(false)
  }

  const isHighPhase = ['cuartos', 'semis', 'final'].includes(match.phase)

  return (
    <div className={`bg-slate-800 rounded-2xl p-5 border transition-all ${
      locked ? 'border-red-900/30 opacity-90' : 'border-slate-700 hover:border-slate-500'
    }${isJoker ? ' ring-1 ring-yellow-500/40' : ''}`}>
      <div className="flex justify-between items-center mb-3">
        <span className={`text-xs font-bold uppercase tracking-wider ${
          isHighPhase ? 'text-orange-400' : 'text-slate-500'
        }`}>{PHASE_LABEL[match.phase] ?? match.phase}</span>
        {match.status === 'finished' ? (
          <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded">Finalizado</span>
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

      {!locked && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          <button
            onClick={() => save(!isJoker)}
            disabled={saving || localHome === '' || localAway === ''}
            className={`w-full py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all disabled:opacity-40 ${
              isJoker
                ? 'bg-yellow-500 text-black shadow-[0_0_14px_rgba(234,179,8,0.35)]'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}>
            <Zap size={13}/> Comodín x2 {isJoker ? '(Activo)' : ''}
          </button>
        </div>
      )}
    </div>
  )
}
