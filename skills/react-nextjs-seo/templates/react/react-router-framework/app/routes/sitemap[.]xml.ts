// Resource route served at /sitemap.xml. If you list routes in app/routes.ts
// instead of using file-name routing, register it there:
// route('sitemap.xml', 'routes/sitemap[.]xml.ts')
import { absoluteUrl } from '../lib/seo'

async function getAllPosts(): Promise<{ slug: string; updatedAt: string }[]> {
  return [] // TODO: your data source
}

export async function loader() {
  const staticRoutes = ['/', '/pricing', '/blog'] // TODO: public routes only
  const posts = await getAllPosts()

  const urls = [
    ...staticRoutes.map((p) => `  <url><loc>${absoluteUrl(p)}</loc></url>`),
    ...posts.map(
      (p) =>
        `  <url><loc>${absoluteUrl(`/blog/${p.slug}`)}</loc><lastmod>${new Date(p.updatedAt).toISOString()}</lastmod></url>`,
    ),
  ].join('\n')

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } },
  )
}
