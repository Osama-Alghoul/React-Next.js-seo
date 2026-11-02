// Generated 1200x630 Open Graph image per blog post. Next adds og:image (+ width/height/alt) automatically.
// X uses it too, since X falls back to og:image.
import { ImageResponse } from 'next/og'
import { siteConfig } from '@/lib/site'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = `${siteConfig.name} blog post`

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  // TODO: load the real post title from your data source
  const title = slug.replace(/-/g, ' ')

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
          background: '#0a0a0a',
          color: '#ffffff',
        }}
      >
        <div style={{ fontSize: 32, opacity: 0.7 }}>{siteConfig.name}</div>
        <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.1 }}>{title}</div>
      </div>
    ),
    size,
  )
}
