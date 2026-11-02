// Site-wide default Open Graph image (1200x630). Delete this if you use a static app/opengraph-image.png.
import { ImageResponse } from 'next/og'
import { siteConfig } from '@/lib/site'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = `${siteConfig.name} — ${siteConfig.tagline}`

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 80,
          background: '#0a0a0a',
          color: '#ffffff',
        }}
      >
        <div style={{ fontSize: 88, fontWeight: 700 }}>{siteConfig.name}</div>
        <div style={{ fontSize: 40, opacity: 0.75, marginTop: 24 }}>{siteConfig.tagline}</div>
      </div>
    ),
    size,
  )
}
