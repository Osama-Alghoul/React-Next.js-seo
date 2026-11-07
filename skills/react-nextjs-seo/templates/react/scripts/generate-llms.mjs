#!/usr/bin/env node
// OPTIONAL: writes llms.txt and llms-full.txt (https://llmstxt.org) into the build folder.
// llms.txt is a community proposal, not a standard. Search engines don't use it for ranking,
// and major AI crawlers don't reliably fetch it yet. Add it only if the user wants it.
// package.json:  "postbuild": "node scripts/generate-sitemap.mjs && node scripts/generate-llms.mjs"
// Env: same as generate-sitemap.mjs (SITE_URL / VITE_SITE_URL / REACT_APP_SITE_URL, OUT_DIR).
import fs from 'node:fs'
import path from 'node:path'

const SITE_URL = (process.env.SITE_URL || process.env.VITE_SITE_URL || process.env.REACT_APP_SITE_URL || 'https://example.com') // TODO
  .replace(/\/$/, '')
const OUT_DIR = process.env.OUT_DIR || (fs.existsSync('dist') ? 'dist' : 'build')

const NAME = 'Your App Name' // TODO: keep in sync with src/seo/site.ts
const DESCRIPTION = 'What your app does and why users should care.' // TODO

// Public, indexable pages only, the same rule as the sitemap. "Optional" marks links an LLM may skip.
const sections = [
  {
    heading: 'Product',
    links: [
      { title: 'Home', path: '/', note: 'What the product does and who it is for' },
      { title: 'Pricing', path: '/pricing', note: 'Plans and limits' },
    ],
  },
  { heading: 'Optional', links: [{ title: 'Blog', path: '/blog' }] },
] // TODO

/** @returns {Promise<{ slug: string, title: string, excerpt: string, markdown: string }[]>} */
async function getAllPosts() {
  // TODO: load from your CMS/API/filesystem. Return Markdown/plain text, not rendered HTML.
  return []
}

const abs = (p) => new URL(p, SITE_URL + '/').toString()
const link = ({ title, path: p, note }) => `- [${title}](${abs(p)})${note ? `: ${note}` : ''}`

const posts = await getAllPosts()
const all = posts.length
  ? [
      ...sections.filter((s) => s.heading !== 'Optional'),
      { heading: 'Blog posts', links: posts.map((p) => ({ title: p.title, path: `/blog/${p.slug}`, note: p.excerpt })) },
      ...sections.filter((s) => s.heading === 'Optional'),
    ]
  : sections

const llms = [`# ${NAME}`, '', `> ${DESCRIPTION}`, '', ...all.flatMap((s) => [`## ${s.heading}`, '', ...s.links.map(link), ''])].join('\n')
const full = [
  llms,
  '---',
  '',
  ...posts.map((p) => [`## ${p.title}`, '', `Source: ${abs(`/blog/${p.slug}`)}`, '', p.markdown.trim(), ''].join('\n')),
].join('\n')

if (!fs.existsSync(OUT_DIR)) {
  console.error(`Build folder "${OUT_DIR}" not found. Run the build first or set OUT_DIR.`)
  process.exit(1)
}
fs.writeFileSync(path.join(OUT_DIR, 'llms.txt'), llms)
fs.writeFileSync(path.join(OUT_DIR, 'llms-full.txt'), full)
console.log(`Wrote ${OUT_DIR}/llms.txt and ${OUT_DIR}/llms-full.txt (${posts.length} full pages)`)
