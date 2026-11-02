// Root layout: site-wide defaults only. NO canonical here — set it per page.
import type { Metadata, Viewport } from 'next'
import { siteConfig, sharedOpenGraph, isProduction } from '@/lib/site'

// 1. Viewport — separate export, never inside `metadata`.
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: siteConfig.themeColor.light },
    { media: '(prefers-color-scheme: dark)', color: siteConfig.themeColor.dark },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // keep pinch-zoom; never 1, never userScalable: false
}

export const metadata: Metadata = {
  // 2. Basic identity
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`, // ~50-60 chars
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,

  // 3. Canonical: intentionally NOT set here (it would mark every page as a copy of the homepage).

  // 4. Robots meta — indexable on production only.
  robots: isProduction
    ? {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-image-preview': 'large',
          'max-snippet': -1,
          'max-video-preview': -1,
        },
      }
    : { index: false, follow: false },

  // 5. Open Graph defaults. The image comes from app/opengraph-image.(png|tsx) automatically.
  openGraph: {
    ...sharedOpenGraph,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    url: '/',
  },

  // 6. X / Twitter — falls back to Open Graph for title/description/image.
  twitter: {
    card: 'summary_large_image',
    site: siteConfig.twitterSite,
    creator: siteConfig.twitterCreator,
  },

  // 7. Icons come from app/favicon.ico, app/icon.(svg|png), app/apple-icon.png;
  //    the manifest from app/manifest.ts. Only the Apple web-app settings are needed here.
  appleWebApp: {
    capable: true,
    title: siteConfig.name,
    statusBarStyle: 'black-translucent',
  },

  // 8. Verification — only include codes you actually have.
  verification: {
    google: 'TODO-google-site-verification', // Search Console → HTML tag → content value
    other: {
      'msvalidate.01': 'TODO-bing-code', // Bing Webmaster Tools
    },
  },
  formatDetection: { email: false, address: false, telephone: false },

  // App links: only if you ship a native app.
  // appLinks: {
  //   ios: { url: 'https://example.com/ios', app_store_id: '123456789' },
  //   android: { package: 'com.example.app', app_name: 'Your App Name' },
  // },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
