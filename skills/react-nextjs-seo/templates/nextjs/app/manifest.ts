// Served at /manifest.webmanifest and linked automatically. Don't also set metadata.manifest.
import type { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/site'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name, // TODO: <= 12 chars if the name is long
    description: siteConfig.description,
    start_url: '/',
    display: 'standalone',
    background_color: siteConfig.themeColor.light,
    theme_color: siteConfig.themeColor.light,
    icons: [
      // TODO: make sure these files exist in /public
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
