import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Caos Mundialista',
  description: 'La quiniela donde las amistades terminan.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-900 text-slate-200 antialiased">{children}</body>
    </html>
  )
}
