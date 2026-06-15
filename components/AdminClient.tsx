'use client'

import { useState, useEffect } from 'react'
import { Flame, RefreshCw, Plus, Copy, Trash2, Ban, UserCheck, Shield, Zap, Lock, Unlock, RotateCcw } from 'lucide-react'
import type { AuthUser, Match } from '@/lib/types'
import Header from './Header'

interface InviteCode { id: string; code: string; used: boolean; used_at: string | null; created_at: string; used_by_user?: { username: string } | null }
interface AdminUser { id: string; username: string; is_admin: boolean; is_banned: boolean; points_base: number; created_at: string }
interface ChaosEvent { id: string; event_type: string; description: string | null; points_bonus: number; validated: boolean; validated_at: string | null; matches?: { home_team: string; away_team: string } | null }

const CHAOS_TYPES = [
  { value: 'mordisco', label: '😟 Mordisco (efecto Suárez)' },
  { value: 'invasion', label: '🏃 Invasión masiva de cancha' },
  { value: 'arbitro_lesionado', label: '🚑 Árbitro sale en camilla' },
  { value: 'gol_portero', label: '🥅 Gol de portero de arco a arco' },
  { value: 'rojo_minuto1', label: '🟥 Roja en el primer minuto' },
  { value: 'otro', label: '🌀 Otro evento' },
]

export default function AdminClient({ currentUser }: { currentUser: AuthUser }) {
  const [matches, setMatches] = useState<Match[]>([])
  const [scores, setScores] = useState<Record<string, { home: string; away: string }>>({})
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [events, setEvents] = useState<ChaosEvent[]>([])
  const [bonusOpen, setBonusOpen] = useState(false)
  const [togglingBonus, setTogglingBonus] = useState(false)
  const [recalculating, setRecalculating] = useState(false)
  const [recalcResult, setRecalcResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [customCode, setCustomCode] = useState('')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [newMatch, setNewMatch] = useState({ home_team: '', away_team: '', phase: 'grupos', matchday: 1, kick_off_time: '' })
  const [newEvent, setNewEvent] = useState({ event_type: 'mordisco', description: '', points_bonus: 5, match_id: '' })
  const [validating, setValidating] = useState<string | null>(null)

  const loadAll = async () => {
    const [mRes, cRes, uRes, eRes, bRes] = await Promise.all([
      fetch('/api/matches'), fetch('/api/admin/invite-codes'),
      fetch('/api/admin/users'), fetch('/api/admin/chaos-events'),
      fetch('/api/admin/bonus-lock'),
    ])
    const mData: Match[] = await mRes.json()
    setMatches(mData)
    const s: Record<string, { home: string; away: string }> = {}
    mData.forEach(m => { s[m.id] = { home: String(m.home_score ?? ''), away: String(m.away_score ?? '') } })
    setScores(s)
    setCodes(await cRes.json())
    setUsers(await uRes.json())
    setEvents(await eRes.json())
    if (bRes.ok) { const bData = await bRes.json(); setBonusOpen(bData.bonus_open ?? false) }
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  const toggleBonus = async () => {
    setTogglingBonus(true)
    const newState = !bonusOpen
    await fetch('/api/admin/bonus-lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bonus_open: newState }),
    })
    setBonusOpen(newState)
    setTogglingBonus(false)
  }

  const recalculatePoints = async () => {
    if (!window.confirm('¿Recalcular los puntos de TODAS las predicciones en partidos finalizados? Esto sobreescribirá los valores actuales.')) return
    setRecalculating(true)
    setRecalcResult(null)
    const res = await fetch('/api/admin/recalculate', { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setRecalcResult(`✅ ${data.updated} predicciones recalculadas en ${data.matches} partidos.`)
    } else {
      setRecalcResult(`❌ Error: ${data.error}`)
    }
    setRecalculating(false)
  }

  const syncFromApi = async () => {
    setSyncing(true); setSyncResult(null)
    const res = await fetch('/api/admin/sync', { method: 'POST' })
    const data = await res.json()
    setSyncResult(res.ok
      ? `✅ ${data.total} partidos — ${data.synced} nuevos, ${data.updated} actualizados, ${data.pointsRecalculated ?? 0} predicciones recalculadas`
      : `❌ ${data.error}`)
    if (res.ok) await loadAll()
    setSyncing(false)
  }

  const updateScore = async (matchId: string) => {
    const s = scores[matchId]
    if (!s || s.home === '' || s.away === '') return
    setSaving(matchId)
    await fetch('/api/admin/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ match_id: matchId, home_score: Number(s.home), away_score: Number(s.away) }) })
    await loadAll(); setSaving(null)
  }

  const createMatch = async () => {
    if (!newMatch.home_team || !newMatch.away_team || !newMatch.kick_off_time) return
    await fetch('/api/admin/matches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newMatch, kick_off_time: new Date(newMatch.kick_off_time).toISOString() }) })
    await loadAll()
    setNewMatch({ home_team: '', away_team: '', phase: 'grupos', matchday: 1, kick_off_time: '' })
  }

  const generateCode = async () => {
    await fetch('/api/admin/invite-codes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: customCode || undefined }) })
    setCustomCode(''); await loadAll()
  }

  const deleteCode = async (id: string) => {
    await fetch('/api/admin/invite-codes', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    await loadAll()
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code); setTimeout(() => setCopiedCode(null), 2000)
  }

  const toggleBan = async (user: AdminUser) => {
    if (!window.confirm(`¿Seguro que quieres ${user.is_banned ? 'desbanear' : 'banear'} a ${user.username}?`)) return
    await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: user.id, is_banned: !user.is_banned }) })
    await loadAll()
  }

  const createEvent = async () => {
    await fetch('/api/admin/chaos-events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newEvent, match_id: newEvent.match_id || null }) })
    setNewEvent({ event_type: 'mordisco', description: '', points_bonus: 5, match_id: '' })
    await loadAll()
  }

  const validateEvent = async (eventId: string) => {
    if (!window.confirm('¿Validar este evento? Se distribuirán los puntos a TODOS los usuarios activos.')) return
    setValidating(eventId)
    const res = await fetch('/api/admin/chaos-events', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_id: eventId }) })
    const data = await res.json()
    if (res.ok) alert(`✅ +${data.points} pts distribuidos a ${data.distributed_to} usuarios.`)
    setValidating(null); await loadAll()
  }

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Flame className="text-orange-500 animate-spin" size={32} /></div>

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 pb-20">
      <Header currentUser={currentUser} activeTab="admin" />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        <h1 className="text-2xl font-black">⚙️ Panel de Administración</h1>

        {/* SYNC */}
        <section className="bg-gradient-to-br from-blue-900/30 to-slate-800 border border-blue-500/30 rounded-xl p-5">
          <h2 className="text-sm font-bold text-blue-300 uppercase tracking-wider mb-3">🔄 Sincronizar desde API-Football</h2>
          <div className="flex gap-2 flex-wrap">
            <button onClick={syncFromApi} disabled={syncing} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm disabled:opacity-50">
              <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
            </button>
            <button onClick={recalculatePoints} disabled={recalculating} className="flex items-center gap-2 px-4 py-2.5 bg-orange-700 hover:bg-orange-600 text-white font-bold rounded-lg text-sm disabled:opacity-50">
              <RotateCcw size={15} className={recalculating ? 'animate-spin' : ''} />
              {recalculating ? 'Recalculando...' : 'Recalcular Puntos'}
            </button>
          </div>
          {syncResult && <p className="mt-3 text-sm text-slate-300 bg-slate-700/50 px-3 py-2 rounded-lg">{syncResult}</p>}
          {recalcResult && <p className="mt-2 text-sm text-slate-300 bg-slate-700/50 px-3 py-2 rounded-lg">{recalcResult}</p>}
        </section>

        {/* BONUS LOCK */}
        <section className="bg-gradient-to-br from-purple-900/20 to-slate-800 border border-purple-500/30 rounded-xl p-5">
          <h2 className="text-sm font-bold text-purple-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            🎯 Predicciones de Largo Plazo
          </h2>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-300">
                Estado: {bonusOpen
                  ? <span className="text-green-400 font-bold">🔓 Abierto para todos</span>
                  : <span className="text-red-400 font-bold">🔒 Bloqueado (torneo en curso)</span>
                }
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {bonusOpen
                  ? 'Los usuarios pueden editar sus apuestas de largo plazo ahora.'
                  : 'Desbloquea para que los usuarios completen sus predicciones.'}
              </p>
            </div>
            <button onClick={toggleBonus} disabled={togglingBonus}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg shrink-0 disabled:opacity-50 ${
                bonusOpen ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-green-700 hover:bg-green-600 text-white'
              }`}>
              {togglingBonus ? '...' : bonusOpen ? <><Lock size={13}/> Bloquear</> : <><Unlock size={13}/> Desbloquear</>}
            </button>
          </div>
        </section>

        {/* CHAOS EVENTS */}
        <section className="bg-gradient-to-br from-purple-900/20 to-slate-800 border border-purple-500/30 rounded-xl p-5">
          <h2 className="text-sm font-bold text-purple-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Zap size={14} /> Eventos Absurdos del Caos
          </h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <select value={newEvent.event_type} onChange={e => setNewEvent(p => ({ ...p, event_type: e.target.value }))}
              className="col-span-2 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
              {CHAOS_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input placeholder="Descripción (opcional)" value={newEvent.description}
              onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))}
              className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">+pts:</span>
              <input type="number" min={1} max={50} value={newEvent.points_bonus}
                onChange={e => setNewEvent(p => ({ ...p, points_bonus: Number(e.target.value) }))}
                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
            </div>
          </div>
          <button onClick={createEvent} className="w-full bg-purple-700 hover:bg-purple-600 text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2">
            <Plus size={14} /> Crear Evento (pendiente de validación)
          </button>
          {events.length > 0 && (
            <div className="mt-4 space-y-2">
              {events.map(ev => (
                <div key={ev.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                  ev.validated ? 'bg-green-900/20 border-green-800/40 opacity-70' : 'bg-slate-900 border-purple-700/30'
                }`}>
                  <div>
                    <p className="text-sm font-bold text-white">{CHAOS_TYPES.find(t => t.value === ev.event_type)?.label ?? ev.event_type}</p>
                    {ev.description && <p className="text-xs text-slate-500">{ev.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-black text-purple-400">+{ev.points_bonus} pts</span>
                    {!ev.validated ? (
                      <button onClick={() => validateEvent(ev.id)} disabled={validating === ev.id}
                        className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs font-bold rounded-lg disabled:opacity-50">
                        {validating === ev.id ? '...' : '✓ Validar'}
                      </button>
                    ) : <span className="text-xs text-green-400">✓ Distribuido</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* INVITE CODES */}
        <section className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2"><Shield size={14} className="text-green-400" /> Códigos de Invitación</h2>
          <div className="flex gap-2 mb-4">
            <input type="text" value={customCode} onChange={e => setCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12))}
              placeholder="Código personalizado (opcional)"
              className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-green-500" />
            <button onClick={generateCode} className="flex items-center gap-1.5 px-4 py-2 bg-green-700 hover:bg-green-600 text-white font-bold rounded-lg text-sm">
              <Plus size={14} /> Generar
            </button>
          </div>
          <div className="space-y-2">
            {codes.length === 0 && <p className="text-sm text-slate-500 italic">Sin códigos creados.</p>}
            {codes.map(c => (
              <div key={c.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                c.used ? 'bg-slate-900/50 border-slate-700 opacity-60' : 'bg-slate-900 border-green-700/40'
              }`}>
                <div className="flex items-center gap-3">
                  <code className={`font-mono font-black text-lg tracking-widest ${c.used ? 'text-slate-500 line-through' : 'text-green-400'}`}>{c.code}</code>
                  {c.used ? <span className="text-xs text-slate-500">Usado por <span className="text-slate-400">{(c.used_by_user as any)?.username ?? '?'}</span></span>
                    : <span className="text-xs text-green-500 bg-green-900/30 px-1.5 py-0.5 rounded">Disponible</span>}
                </div>
                <div className="flex items-center gap-2">
                  {!c.used && <button onClick={() => copyCode(c.code)} className="p-1.5 text-slate-400 hover:text-white">{copiedCode === c.code ? <span className="text-xs text-green-400">✓</span> : <Copy size={13}/>}</button>}
                  {!c.used && <button onClick={() => deleteCode(c.id)} className="p-1.5 text-slate-600 hover:text-red-400"><Trash2 size={13}/></button>}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* USER MANAGEMENT */}
        <section className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2"><Ban size={14} className="text-red-400" /> Gestión de Usuarios ({users.length})</h2>
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                u.is_banned ? 'bg-red-950/30 border-red-800/40' : 'bg-slate-900 border-slate-700'
              }`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${u.is_banned ? 'text-red-400 line-through' : 'text-white'}`}>{u.username}</span>
                    {u.is_admin && <span className="text-[10px] bg-orange-600 text-white px-1.5 py-0.5 rounded">Admin</span>}
                    {u.is_banned && <span className="text-[10px] bg-red-800 text-red-200 px-1.5 py-0.5 rounded">Baneado</span>}
                  </div>
                  <p className="text-xs text-slate-500">{new Date(u.created_at).toLocaleDateString('es',{day:'2-digit',month:'short'})}{u.points_base > 0 && ` · Fair play: +${u.points_base}`}</p>
                </div>
                {u.id !== currentUser.id && (
                  <button onClick={() => toggleBan(u)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg ${
                    u.is_banned ? 'bg-green-800 hover:bg-green-700 text-green-200' : 'bg-red-900/50 hover:bg-red-800 text-red-300'
                  }`}>
                    {u.is_banned ? <><UserCheck size={12}/> Desbanear</> : <><Ban size={12}/> Banear</>}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ADD MATCH */}
        <section className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Agregar Partido Manual</h2>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Local" value={newMatch.home_team} onChange={e => setNewMatch(p => ({ ...p, home_team: e.target.value }))} className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" />
            <input placeholder="Visitante" value={newMatch.away_team} onChange={e => setNewMatch(p => ({ ...p, away_team: e.target.value }))} className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500" />
            <select value={newMatch.phase} onChange={e => setNewMatch(p => ({ ...p, phase: e.target.value }))} className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
              {['grupos','octavos','cuartos','semis','final'].map(ph => <option key={ph} value={ph}>{ph}</option>)}
            </select>
            <input type="number" placeholder="Jornada" value={newMatch.matchday} onChange={e => setNewMatch(p => ({ ...p, matchday: Number(e.target.value) }))} className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
            <input type="datetime-local" value={newMatch.kick_off_time} onChange={e => setNewMatch(p => ({ ...p, kick_off_time: e.target.value }))} className="col-span-2 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
          </div>
          <button onClick={createMatch} className="mt-3 w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 rounded-lg text-sm">+ Agregar</button>
        </section>

        {/* SCORES */}
        <section>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Resultados ({matches.length} partidos)</h2>
          <div className="space-y-2">
            {matches.map(match => (
              <div key={match.id} className={`bg-slate-800 border rounded-xl p-3 flex flex-wrap items-center gap-2 ${
                match.status==='finished'?'border-green-900/40':match.status==='live'?'border-red-500/40':'border-slate-700'
              }`}>
                <div className="flex-1 text-sm min-w-0">
                  <span className="font-bold">{match.home_team} vs {match.away_team}</span>
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                    match.status==='finished'?'bg-green-900/50 text-green-400':match.status==='live'?'bg-red-900/50 text-red-400 animate-pulse':'bg-slate-700 text-slate-400'
                  }`}>{match.phase} • {match.status}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input type="number" min={0} max={20} value={scores[match.id]?.home??''} onChange={e=>setScores(s=>({...s,[match.id]:{...s[match.id],home:e.target.value}}))} className="w-10 h-9 text-center font-black bg-slate-900 border border-slate-600 rounded-lg focus:outline-none focus:border-orange-500 text-white text-sm"/>
                  <span className="text-slate-500">-</span>
                  <input type="number" min={0} max={20} value={scores[match.id]?.away??''} onChange={e=>setScores(s=>({...s,[match.id]:{...s[match.id],away:e.target.value}}))} className="w-10 h-9 text-center font-black bg-slate-900 border border-slate-600 rounded-lg focus:outline-none focus:border-orange-500 text-white text-sm"/>
                  <button onClick={()=>updateScore(match.id)} disabled={saving===match.id} className="px-3 py-2 bg-green-700 hover:bg-green-600 text-white text-xs font-bold rounded-lg disabled:opacity-50">{saving===match.id?'...':'✓'}</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
