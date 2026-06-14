'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

const TABS = ['/partidos', '/ranking', '/bonus', '/historial', '/admin']

export function useSwipeNav(activeTab: string, isAdmin: boolean) {
  const router = useRouter()
  const startX = useRef<number | null>(null)
  const startY = useRef<number | null>(null)

  useEffect(() => {
    const tabs = isAdmin ? TABS : TABS.filter(t => t !== '/admin')
    const idx = tabs.findIndex(t => t.includes(activeTab))

    const onStart = (e: TouchEvent) => {
      startX.current = e.touches[0].clientX
      startY.current = e.touches[0].clientY
    }

    const onEnd = (e: TouchEvent) => {
      if (startX.current === null || startY.current === null) return
      const dx = e.changedTouches[0].clientX - startX.current
      const dy = e.changedTouches[0].clientY - startY.current
      startX.current = null
      startY.current = null
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return
      if (dx < 0 && idx < tabs.length - 1) router.push(tabs[idx + 1])
      else if (dx > 0 && idx > 0) router.push(tabs[idx - 1])
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchend', onEnd)
    }
  }, [activeTab, isAdmin, router])
}
