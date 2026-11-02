// Served at /robots.txt. Delete any static public/robots.txt so it doesn't conflict.
import type { MetadataRoute } from 'next'
import { absoluteUrl, isProduction } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  // Keep preview/staging deployments out of search entirely.
  if (!isProduction) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard/', '/settings/', '/admin/'], // TODO: your private areas
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  }
}
