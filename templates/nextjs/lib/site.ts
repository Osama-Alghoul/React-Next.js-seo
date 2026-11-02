// Single source of truth for SEO values. Import from here instead of repeating strings.
// Replace every TODO before shipping.
import type { Metadata } from 'next'

export const siteConfig = {
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com', // TODO: production URL, no trailing slash
  name: 'Your App Name', // TODO
  tagline: 'The Ultimate Solution', // TODO
  description: 'What your app does and why users should care.', // TODO: <= ~160 chars, written for humans
  locale: 'en_US',
  twitterSite: '@your_company', // TODO or remove
  twitterCreator: '@your_author', // TODO or remove
  organization: {
    legalName: 'Your Company Name', // TODO
    logo: '/logo.png', // TODO: square, >= 112x112
    sameAs: [
      // TODO: real profile URLs, e.g. 'https://x.com/your_company', 'https://www.linkedin.com/company/your-company'
    ] as string[],
  },
  themeColor: { light: '#ffffff', dark: '#0a0a0a' }, // TODO: brand colors
} as const

/** Absolute URL helper for places metadataBase doesn't reach (JSON-LD, sitemap, robots). */
export const absoluteUrl = (path = '/') => new URL(path, siteConfig.url).toString()

/** Indexing only on production deploys, so previews never end up in Google. */
export const isProduction = process.env.VERCEL_ENV
  ? process.env.VERCEL_ENV === 'production'
  : process.env.NODE_ENV === 'production'

/**
 * Shared Open Graph defaults. Next.js merges metadata shallowly, so a page that sets
 * `openGraph` must re-spread these or it loses siteName, locale, images, etc.
 */
export const sharedOpenGraph = {
  type: 'website',
  siteName: siteConfig.name,
  locale: siteConfig.locale,
} satisfies Metadata['openGraph']

/** Per-page helper: title, description, canonical and OG url in one call. */
export function pageMetadata({
  title,
  description,
  path,
  languages,
}: {
  title: string
  description?: string
  path: string
  languages?: Record<string, string>
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path, ...(languages ? { languages } : {}) },
    openGraph: { ...sharedOpenGraph, title, description, url: path },
  }
}
