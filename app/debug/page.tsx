'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugPage() {
  const [server, setServer] = useState<any>(null)
  const [clientUrl] = useState(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'NO DEFINIDA')
  const [realtimeStatus, setRealtimeStatus] = useState('connecting...')
  const [swStatus, setSwStatus] = useState('checking...')
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/debug')
      .then(r => r.json())
      .then(setServer)
      .catch(e => setServerError(e.message))

    const ch = supabase.channel('debug-probe')
      .subscribe((status: string) => setRealtimeStatus(status))

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        setSwStatus(reg
          ? `Activo: ${reg.active?.scriptURL ?? '?'} | ${reg.active?.state}`
          : 'Sin SW registrado')
      })
    } else {
      setSwStatus('No soportado')
    }

    return () => { supabase.removeChannel(ch) }
  }, [])

  const nzsgoe = 'nzsgoeuwpwvtvhjzbrkz'

  return (
    <div style={{ fontFamily: 'monospace', padding: 24, background: '#0f172a', color: '#e2e8f0', minHeight: '100vh' }}>
      <h1 style={{ color: '#f97316', marginBottom: 8, fontSize: 20 }}>🔍 Debug Harness — Caos Mundialista</h1>
      <p style={{ color: '#64748b', marginBottom: 24, fontSize: 12 }}>Verde = correcto | Rojo = problema detectado</p>

      <Section title="CLIENT — Variables bakeadas en el bundle JS">
        <Row label="NEXT_PUBLIC_SUPABASE_URL" value={clientUrl} ok={clientUrl.includes(nzsgoe)} />
      </Section>

      {serverError && (
        <Section title="ERROR al cargar /api/debug">
          <span style={{ color: '#f87171' }}>{serverError}</span>
        </Section>
      )}

      {server && (
        <>
          <Section title="SERVER — Variables en runtime (API routes)">
            <Row label="NEXT_PUBLIC_SUPABASE_URL" value={server.build.supabase_url} ok={server.build.supabase_url.includes(nzsgoe)} />
            <Row label="SUPABASE_SERVICE_ROLE_KEY (primeros 20 chars)" value={server.build.service_key_prefix} ok={server.build.service_key_prefix !== 'NO DEFINIDA'} />
            <Row label="NEXT_PUBLIC_SUPABASE_ANON_KEY (primeros 20 chars)" value={server.build.anon_key_prefix} ok={server.build.anon_key_prefix !== 'NO DEFINIDA'} />
            <Row label="NEXT_PUBLIC_APP_URL" value={server.build.app_url} />
            <Row label="NODE_ENV" value={server.build.node_env} />
            <Row label="Build timestamp" value={server.build.timestamp} />
          </Section>

          <Section title="CLIENT vs SERVER — ¿Coinciden?">
            <Row
              label="URL cliente === URL servidor"
              value={clientUrl === server.build.supabase_url ? '✓ Iguales' : `✗ DISTINTAS — cliente: ${clientUrl} | servidor: ${server.build.supabase_url}`}
              ok={clientUrl === server.build.supabase_url}
            />
          </Section>

          <Section title="DATABASE — Conexión directa desde servidor">
            {server.database.error ? (
              <div style={{ color: '#f87171' }}>
                <div>❌ Error: {server.database.error.message}</div>
                {server.database.error.code && <div>Code: {server.database.error.code}</div>}
                {server.database.error.hint && <div>Hint: {server.database.error.hint}</div>}
              </div>
            ) : (
              <>
                <Row label="Usuarios encontrados" value={String(server.database.result?.count)} ok={server.database.result?.count === 3} />
                {server.database.result?.users?.map((u: any, i: number) => (
                  <Row key={i} label={`  Usuario ${i + 1}`} value={`${u.username} | points_base: ${u.points_base}`} ok={u.points_base === 9} />
                ))}
              </>
            )}
          </Section>
        </>
      )}

      <Section title="REALTIME — Supabase WebSocket">
        <Row label="Estado canal debug-probe" value={realtimeStatus} ok={realtimeStatus === 'SUBSCRIBED'} />
      </Section>

      <Section title="SERVICE WORKER — Posible cache de browser">
        <Row label="Estado" value={swStatus} />
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20, border: '1px solid #1e293b', borderRadius: 8, padding: 16 }}>
      <h2 style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 12px 0' }}>{title}</h2>
      {children}
    </div>
  )
}

function Row({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  const color = ok === true ? '#4ade80' : ok === false ? '#f87171' : '#cbd5e1'
  const icon = ok === true ? '✓' : ok === false ? '✗' : '·'
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 8, fontSize: 12, alignItems: 'flex-start' }}>
      <span style={{ color: ok === true ? '#4ade80' : ok === false ? '#f87171' : '#475569', minWidth: 12 }}>{icon}</span>
      <span style={{ color: '#64748b', minWidth: 320, flexShrink: 0 }}>{label}</span>
      <span style={{ color, wordBreak: 'break-all' }}>{value}</span>
    </div>
  )
}
