// Prerender public routes to static HTML so social and AI crawlers (which don't run JS)
// get real per-route tags. Keep ssr: true if some routes need a server; false for a fully static site.
import type { Config } from '@react-router/dev/config'

async function getAllPosts(): Promise<{ slug: string }[]> {
  return [] // TODO: your data source
}

export default {
  ssr: true,
  async prerender({ getStaticPaths }) {
    const posts = await getAllPosts()
    return [
      ...getStaticPaths(), // every route without dynamic params
      ...posts.map((p) => `/blog/${p.slug}`),
      '/sitemap.xml',
      '/robots.txt',
    ]
  },
} satisfies Config
