// React Router v7 framework mode. The deepest route's `meta` REPLACES all parent meta (no merging),
// so every route returns seoMeta(...), which always includes the site-wide tags.
import type { MetaDescriptor } from 'react-router'

export const site = {
  url: (process.env.SITE_URL ?? 'https://example.com').replace(/\/$/, ''), // TODO (server-side env)
  name: 'Your App Name', // TODO
  defaultTitle: 'Your App Name — The Ultimate Solution', // TODO
  description: 'What your app does and why users should care.', // TODO
  ogImage: '/og-image.png', // TODO: 1200x630
  locale: 'en_US',
  twitterSite: '@your_company', // TODO
  verification: {
    google: 'TODO-google-code',
    bing: 'TODO-bing-code',
  },
}

export const absoluteUrl = (path = '/') =>
  /^https?:\/\//.test(path) ? path : new URL(path, site.url + '/').toString()

type SeoInput = {
  title?: string
  description?: string
  path: string
  image?: string
  imageAlt?: string
  type?: 'website' | 'article'
  noindex?: boolean
  languages?: Record<string, string>
}

export function seoMeta({
  title,
  description = site.description,
  path,
  image = site.ogImage,
  imageAlt = 'App preview',
  type = 'website',
  noindex = false,
  languages,
}: SeoInput): MetaDescriptor[] {
  const fullTitle = title ? `${title} | ${site.name}` : site.defaultTitle
  const url = absoluteUrl(path.split(/[?#]/)[0])
  const img = absoluteUrl(image)

  return [
    { title: fullTitle },
    { name: 'description', content: description },
    noindex
      ? { name: 'robots', content: 'noindex, nofollow' }
      : { name: 'robots', content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' },
    ...(noindex ? [] : [{ tagName: 'link', rel: 'canonical', href: url } as MetaDescriptor]),
    ...(!noindex && languages
      ? Object.entries(languages).map(
          ([lang, href]) => ({ tagName: 'link', rel: 'alternate', hrefLang: lang, href: absoluteUrl(href) }) as MetaDescriptor,
        )
      : []),
    // Open Graph
    { property: 'og:site_name', content: site.name },
    { property: 'og:locale', content: site.locale },
    { property: 'og:type', content: type },
    { property: 'og:title', content: fullTitle },
    { property: 'og:description', content: description },
    { property: 'og:url', content: url },
    { property: 'og:image', content: img },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:image:alt', content: imageAlt },
    // X (falls back to og:* for the rest)
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:site', content: site.twitterSite },
    // Verification + format detection: site-wide, so they must be repeated on every route
    { name: 'google-site-verification', content: site.verification.google },
    { name: 'msvalidate.01', content: site.verification.bing },
    { name: 'format-detection', content: 'telephone=no, email=no, address=no' },
  ]
}
