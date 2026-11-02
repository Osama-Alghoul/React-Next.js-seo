#!/usr/bin/env node
// Writes sitemap.xml and robots.txt into the build folder after `vite build` / `react-scripts build`.
// package.json:  "postbuild": "node scripts/generate-sitemap.mjs"
// Env (plain Node doesn't read .env; pass from CI or use `node --env-file=.env`):
//   SITE_URL / VITE_SITE_URL / REACT_APP_SITE_URL   production URL
//   OUT_DIR       build folder (default: dist if it exists, else build)
//   DEPLOY_ENV    anything other than "production" writes a disallow-all robots.txt
import fs from 'node:fs'
import path from 'node:path'

const SITE_URL = (process.env.SITE_URL || process.env.VITE_SITE_URL || process.env.REACT_APP_SITE_URL || 'https://example.com') // TODO
  .replace(/\/$/, '')
const OUT_DIR = process.env.OUT_DIR || (fs.existsSync('dist') ? 'dist' : 'build')
const IS_PROD = (process.env.DEPLOY_ENV ?? 'production') === 'production'

// Public, indexable, canonical routes only. Never private or noindex pages.
const staticRoutes = ['/', '/pricing', '/blog'] // TODO

// Private areas to keep crawlers out of.
const disallow = ['/api/', '/dashboard/', '/settings/', '/admin/'] // TODO

/** @returns {Promise<{ path: string, lastmod?: string }[]>} */
async function dynamicRoutes() {
  // TODO: load from your CMS/API/filesystem, e.g.
  // const posts = await fetch('https://api.example.com/posts').then((r) => r.json())
  // return posts.map((p) => ({ path: `/blog/${p.slug}`, lastmod: p.updatedAt }))
  return []
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const entries = [...staticRoutes.map((p) => ({ path: p })), ...(await dynamicRoutes())]
const urls = entries
  .map(({ path: p, lastmod }) => {
    const loc = esc(new URL(p, SITE_URL + '/').toString())
    const lm = lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ''
    return `  <url><loc>${loc}</loc>${lm}</url>`
  })
  .join('\n')

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`

const robots = IS_PROD
  ? `User-agent: *\nAllow: /\n${disallow.map((d) => `Disallow: ${d}`).join('\n')}\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
  : `User-agent: *\nDisallow: /\n`

if (!fs.existsSync(OUT_DIR)) {
  console.error(`Build folder "${OUT_DIR}" not found. Run the build first or set OUT_DIR.`)
  process.exit(1)
}
fs.writeFileSync(path.join(OUT_DIR, 'sitemap.xml'), sitemap)
fs.writeFileSync(path.join(OUT_DIR, 'robots.txt'), robots)
console.log(`Wrote ${entries.length} URLs to ${OUT_DIR}/sitemap.xml and ${OUT_DIR}/robots.txt (${IS_PROD ? 'production' : 'disallow-all'})`)
