// Served at /sitemap.xml. List every PUBLIC, INDEXABLE, CANONICAL URL — never private or noindex pages.
import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/site'

// TODO: replace with your data source.
async function getAllPosts(): Promise<{ slug: string; updatedAt: string }[]> {
  return []
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ['/', '/pricing', '/blog'] // TODO: all public static routes

  const posts = await getAllPosts()

  return [
    ...staticRoutes.map((path) => ({ url: absoluteUrl(path) })),
    ...posts.map((p) => ({
      url: absoluteUrl(`/blog/${p.slug}`),
      lastModified: new Date(p.updatedAt), // use real dates; Google ignores priority/changeFrequency
    })),
    // Multilingual (Next 14.2+):
    // { url: absoluteUrl('/pricing'), alternates: { languages: { es: absoluteUrl('/es/pricing') } } },
  ]
}
