// Single source of truth for SEO values in a React (Vite/CRA) app.
// Keep in sync with the static defaults in index.html. Replace every TODO.

// Vite: import.meta.env.VITE_SITE_URL   |   CRA: process.env.REACT_APP_SITE_URL
const envUrl = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_SITE_URL

export const site = {
  url: (envUrl ?? 'https://example.com').replace(/\/$/, ''), // TODO: production URL
  name: 'Your App Name', // TODO
  defaultTitle: 'Your App Name — The Ultimate Solution', // TODO: ~50-60 chars
  description: 'What your app does and why users should care.', // TODO: <= ~160 chars
  ogImage: '/og-image.png', // TODO: 1200x630 file in /public
  ogImageAlt: 'App preview',
  locale: 'en_US',
  twitterSite: '@your_company', // TODO or remove
}

/** Absolute URL from a path. There's no metadataBase in React, so every URL goes through this. */
export function absoluteUrl(path = '/'): string {
  if (/^https?:\/\//.test(path)) return path
  return new URL(path, site.url + '/').toString()
}

/** Canonical path: no query string or hash, no trailing slash (except root). */
export function cleanPath(path: string): string {
  const p = path.split(/[?#]/)[0] || '/'
  return p.length > 1 ? p.replace(/\/+$/, '') : '/'
}

export type SeoProps = {
  /** Page title without the brand. Becomes "Title | Brand". Omit on the homepage. */
  title?: string
  description?: string
  /** Route path, e.g. "/pricing" or `/blog/${slug}`. Used for the canonical and og:url. */
  path: string
  /** Relative or absolute. Defaults to the site OG image (1200x630). */
  image?: string
  imageAlt?: string
  type?: 'website' | 'article'
  /** Private / not-found pages: adds robots noindex and drops the canonical. */
  noindex?: boolean
  /** hreflang map, e.g. { 'en-US': '/en-US/pricing', 'es-ES': '/es-ES/pricing', 'x-default': '/pricing' } */
  languages?: Record<string, string>
  article?: { publishedTime?: string; modifiedTime?: string; author?: string }
}

export function buildSeo({ title, description, path, image, imageAlt, type = 'website' }: SeoProps) {
  return {
    fullTitle: title ? `${title} | ${site.name}` : site.defaultTitle,
    desc: description ?? site.description,
    url: absoluteUrl(cleanPath(path)),
    img: absoluteUrl(image ?? site.ogImage),
    alt: imageAlt ?? site.ogImageAlt,
    type,
  }
}

/**
 * Call once in main.tsx BEFORE rendering. Removes the index.html fallback tags marked
 * data-seo-default so they don't duplicate the tags each route renders.
 * Crawlers that don't run JS never execute this, so they still see the defaults.
 */
export function removeSeoDefaults() {
  document.querySelectorAll('head [data-seo-default]').forEach((el) => el.remove())
}
