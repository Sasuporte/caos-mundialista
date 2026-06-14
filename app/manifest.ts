import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Caos Mundialista',
    short_name: 'Caos',
    description: 'La quiniela donde las amistades terminan.',
    start_url: '/partidos',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#ea580c',
    orientation: 'portrait',
    categories: ['games', 'sports'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  }
}
