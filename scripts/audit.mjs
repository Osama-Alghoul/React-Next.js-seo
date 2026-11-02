#!/usr/bin/env node
// Static SEO audit for Next.js App Router projects. Read-only, zero dependencies.
// Usage: node audit.mjs [project-root]
// Exit code: 1 if any ERROR was found, else 0.

import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.argv[2] ?? '.')
const results = { error: [], warn: [], ok: [], info: [] }
const add = (level, msg) => results[level].push(msg)
const rel = (p) => path.relative(root, p).split(path.sep).join('/')
const read = (p) => { try { return fs.readFileSync(p, 'utf8') } catch { return '' } }
const exists = (p) => fs.existsSync(p)

// Strip comments so commented-out examples don't count.
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\'"`])\/\/.*$/gm, '$1')

function walk(dir, out = []) {
  if (!exists(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git', 'dist', 'out', 'build'].includes(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

// ---------- locate project ----------
const pkg = (() => { try { return JSON.parse(read(path.join(root, 'package.json'))) } catch { return null } })()
if (!pkg) {
  console.error(`No package.json at ${root}`)
  process.exit(2)
}
const deps = { ...pkg.devDependencies, ...pkg.dependencies }
const majorOf = (v) => parseInt(String(v ?? '').replace(/^[^\d]*/, ''), 10)
const nextVersion = deps.next
const nextMajor = majorOf(nextVersion)

if (nextVersion) {
  add('info', `Framework: Next.js ${nextVersion}`)
  auditNext()
} else if (deps.react) {
  auditReact()
} else {
  add('error', 'Neither `next` nor `react` found in package.json.')
}
report()

// =====================================================================
// Next.js (App Router)
// =====================================================================
function auditNext() {
const appDir = [path.join(root, 'src', 'app'), path.join(root, 'app')].find(exists)
if (!appDir) {
  const hasPages = exists(path.join(root, 'pages')) || exists(path.join(root, 'src', 'pages'))
  add('error', hasPages
    ? 'Only a Pages Router (`pages/`) was found. This audit targets the App Router (`app/`).'
    : 'No `app/` or `src/app/` directory found.')
  report()
}
add('info', `App directory: ${rel(appDir)}`)

const srcRoot = path.dirname(appDir)
const appFiles = walk(appDir)
const allSrcFiles = walk(srcRoot).filter((f) => /\.(t|j)sx?$|\.mjs$/.test(f))
const codeOf = (f) => stripComments(read(f))
const findInApp = (re) => appFiles.find((f) => re.test(path.basename(f)) && path.dirname(f) === appDir)

// ---------- root layout ----------
const rootLayout = ['layout.tsx', 'layout.jsx', 'layout.ts', 'layout.js'].map((n) => path.join(appDir, n)).find(exists)
const layoutSrc = rootLayout ? codeOf(rootLayout) : ''
if (!rootLayout) add('error', 'No root layout (app/layout.tsx) found.')

const hasMetadataExport = /export\s+(const\s+metadata\b|async\s+function\s+generateMetadata|function\s+generateMetadata)/.test(layoutSrc)
if (rootLayout && !hasMetadataExport) add('error', 'Root layout does not export `metadata` or `generateMetadata`.')

// 1. Viewport
const viewportFiles = allSrcFiles.filter((f) => /export\s+(const\s+viewport\b|(async\s+)?function\s+generateViewport)/.test(codeOf(f)))
if (viewportFiles.length) add('ok', `Viewport exported (${viewportFiles.map(rel).join(', ')}).`)
else add('warn', 'No `viewport` export found. Add one to the root layout (width, initialScale, maximumScale: 5, themeColor).')

for (const f of allSrcFiles) {
  const src = codeOf(f)
  if (/maximumScale\s*:\s*1(\.0)?\b(?!\.\d*[1-9])/.test(src)) add('error', `${rel(f)}: maximumScale: 1 blocks zoom (accessibility). Use 5.`)
  if (/userScalable\s*:\s*false/.test(src)) add('error', `${rel(f)}: userScalable: false blocks zoom (accessibility). Remove it.`)
  if (/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0)?\b/.test(src)) add('error', `${rel(f)}: viewport meta blocks zoom. Allow pinch-zoom.`)
}

// Deprecated fields inside metadata (heuristic: in a file that exports metadata, outside a viewport export)
for (const f of allSrcFiles) {
  const src = codeOf(f)
  const m = src.match(/export\s+const\s+metadata[^=]*=\s*\{([\s\S]*?)\n\}/)
  if (!m) continue
  if (/^\s*(viewport|themeColor|colorScheme)\s*:/m.test(m[1])) {
    add('warn', `${rel(f)}: \`viewport\`/\`themeColor\`/\`colorScheme\` inside metadata is deprecated — move to \`export const viewport\`.`)
  }
}

// 2. Basic identity
if (rootLayout) {
  if (/metadataBase\s*:/.test(layoutSrc)) add('ok', '`metadataBase` set.')
  else add('error', 'Root layout is missing `metadataBase` — OG images and canonicals will not resolve to absolute URLs.')

  if (/template\s*:\s*['"`][^'"`]*%s/.test(layoutSrc)) add('ok', 'Title template set.')
  else add('warn', 'No `title.template` (e.g. "%s | Brand") in the root layout.')

  if (/\bdescription\s*:/.test(layoutSrc)) add('ok', 'Description set in root layout.')
  else add('error', 'Root layout has no `description`.')

  const defTitle = layoutSrc.match(/default\s*:\s*(['"])(.*?)\1/)
  if (defTitle && defTitle[2].length > 60) add('warn', `Default title is ${defTitle[2].length} chars (>60) and may be truncated in Google.`)
  const desc = layoutSrc.match(/\bdescription\s*:\s*\n?\s*(['"])(.*?)\1/)
  if (desc && desc[2].length > 160) add('warn', `Root description is ${desc[2].length} chars (>160) and may be truncated.`)
}

// 3. Canonical — never in root layout; check per-page coverage
if (/canonical\s*:/.test(layoutSrc)) {
  add('error', 'Root layout sets `alternates.canonical`. Every page inherits it and will claim to be a copy of that URL. Set canonical per page instead.')
}
for (const f of appFiles.filter((f) => /[\\/]layout\.(t|j)sx?$/.test(f) && f !== rootLayout)) {
  if (/canonical\s*:/.test(codeOf(f))) add('warn', `${rel(f)}: canonical in a nested layout applies to every child page. Make sure it wraps exactly one page.`)
}

const pageFiles = appFiles.filter((f) => /[\\/]page\.(t|j)sx?$/.test(f))
const routeOf = (f) => {
  const r = '/' + path.relative(appDir, path.dirname(f)).split(path.sep)
    .filter((s) => s && !/^\(.*\)$/.test(s) && !s.startsWith('@')).join('/')
  return r === '/.' ? '/' : r
}
const PRIVATE = /(^|\/)(dashboard|settings|account|admin|checkout|billing|profile|auth|login|signin|sign-in|signup|sign-up|register|logout|onboarding|internal|app)(\/|$)/i
const segmentChain = (f) => {
  // page file + every layout from its dir up to appDir
  const chain = [f]
  let dir = path.dirname(f)
  while (dir.startsWith(appDir)) {
    for (const n of ['layout.tsx', 'layout.jsx', 'layout.ts', 'layout.js']) if (exists(path.join(dir, n))) chain.push(path.join(dir, n))
    if (dir === appDir) break
    dir = path.dirname(dir)
  }
  return chain
}

const missingCanonical = []
const privateIndexable = []
const clientWithMetadata = []
for (const f of pageFiles) {
  const route = routeOf(f)
  const src = codeOf(f)
  const isPrivate = PRIVATE.test(route)
  const chain = segmentChain(f)
  const noindex = chain.some((c) => /index\s*:\s*false|noindex/.test(codeOf(c)))
  if (/^\s*['"]use client['"]/.test(read(f)) && /export\s+(const\s+metadata|(async\s+)?function\s+generateMetadata)/.test(src)) {
    clientWithMetadata.push(rel(f))
  }
  if (isPrivate) {
    if (!noindex) privateIndexable.push(route)
  } else if (!/canonical\s*:/.test(src) && !/pageMetadata\s*\(/.test(src)) {
    missingCanonical.push(route)
  }
}
if (clientWithMetadata.length) add('error', `Metadata exported from 'use client' files (ignored by Next.js): ${clientWithMetadata.join(', ')}`)
if (pageFiles.length && !missingCanonical.length) add('ok', 'Every public page sets a canonical.')
if (missingCanonical.length) add('warn', `Public pages without a canonical (${missingCanonical.length}): ${missingCanonical.join(', ')}`)
if (privateIndexable.length) add('warn', `Private-looking routes without robots index:false: ${privateIndexable.join(', ')}`)

// hreflang
const usesLanguages = allSrcFiles.some((f) => /languages\s*:\s*\{/.test(codeOf(f)))
const hasLocaleSegment = appFiles.some((f) => /[\\/]\[(locale|lang|lng)\][\\/]/.test(f))
if ((hasLocaleSegment || pkg.dependencies?.['next-intl'] || pkg.dependencies?.['next-i18next']) && !usesLanguages) {
  add('warn', 'Project looks multilingual but no `alternates.languages` (hreflang) were found.')
}
if (usesLanguages && !allSrcFiles.some((f) => /['"]x-default['"]/.test(codeOf(f)))) {
  add('warn', '`alternates.languages` is used without an `x-default` entry.')
}

// 4. Robots meta
if (rootLayout) {
  if (/max-image-preview/.test(layoutSrc)) add('ok', 'googleBot max-image-preview set.')
  else add('warn', "Root layout `robots.googleBot` lacks `'max-image-preview': 'large'` (bigger thumbnails in Discover/Images).")
  if (/robots\s*:\s*\{[^}]*index\s*:\s*false/.test(layoutSrc) && !/isProd|production|VERCEL_ENV|NODE_ENV/.test(layoutSrc)) {
    add('error', 'Root layout sets `index: false` unconditionally — the whole site is hidden from search.')
  }
}

// 5. Open Graph
const ogFile = appFiles.find((f) => /[\\/]opengraph-image\.(png|jpe?g|gif|tsx?|jsx?)$/.test(f) && path.dirname(f) === appDir)
const ogImagesInMeta = /openGraph\s*:\s*\{[\s\S]*?images\s*:/.test(layoutSrc)
if (ogFile) add('ok', `Default OG image file: ${rel(ogFile)}.`)
else if (ogImagesInMeta) add('ok', 'OG images set in root metadata.')
else add('warn', 'No default Open Graph image (app/opengraph-image.png|tsx or openGraph.images). Shared links will have no preview image.')
if (ogImagesInMeta && !/width\s*:\s*1200/.test(layoutSrc)) add('info', 'OG image in metadata: include width: 1200, height: 630 and alt.')
if (rootLayout && !/openGraph\s*:/.test(layoutSrc)) add('warn', 'Root layout has no `openGraph` defaults (siteName, type, locale, title, description).')
// Shallow-merge pitfall
for (const f of pageFiles) {
  const src = codeOf(f)
  if (/openGraph\s*:\s*\{/.test(src) && !/\.\.\.\s*\w*[Oo]pen[Gg]raph|\.\.\.\s*shared/.test(src) && !ogFile && ogImagesInMeta && !/images\s*:/.test(src)) {
    add('info', `${rel(f)}: page-level openGraph replaces the parent's (shallow merge) — the root OG image is lost here unless re-spread.`)
  }
}

// 6. Twitter
if (/twitter\s*:\s*\{[\s\S]*?summary_large_image/.test(layoutSrc)) add('ok', "Twitter card 'summary_large_image' set.")
else add('warn', "No `twitter.card: 'summary_large_image'` in the root layout.")

// 7. Icons + manifest
const iconFiles = appFiles.filter((f) => path.dirname(f) === appDir && /^(favicon\.ico|icon\d*\.(ico|png|jpe?g|svg|tsx?|jsx?)|apple-icon\d*\.(png|jpe?g|tsx?|jsx?))$/.test(path.basename(f)))
const publicDir = path.join(root, 'public')
const hasFavicon = iconFiles.some((f) => /favicon\.ico$/.test(f)) || exists(path.join(publicDir, 'favicon.ico'))
const hasApple = iconFiles.some((f) => /apple-icon/.test(f)) || /apple\s*:/.test(layoutSrc)
const hasIcon = iconFiles.some((f) => /[\\/]icon/.test(f)) || /icons\s*:/.test(layoutSrc)
hasFavicon ? add('ok', 'favicon.ico present.') : add('warn', 'No favicon.ico (app/favicon.ico).')
hasIcon ? add('ok', 'Icon present.') : add('warn', 'No app/icon.svg|png — add a modern high-res icon.')
hasApple ? add('ok', 'Apple touch icon present.') : add('warn', 'No apple-icon.png (180×180) in app/.')
const manifestFile = findInApp(/^manifest\.(ts|js|json|webmanifest)$/) || [path.join(publicDir, 'manifest.json'), path.join(publicDir, 'site.webmanifest'), path.join(publicDir, 'manifest.webmanifest')].find(exists)
manifestFile ? add('ok', `Manifest: ${rel(manifestFile)}.`) : add('warn', 'No web app manifest (app/manifest.ts).')
if (!/appleWebApp\s*:/.test(layoutSrc)) add('info', 'No `appleWebApp` in root metadata (optional; makes the site installable on iOS).')

// 8. Verification etc.
if (/verification\s*:/.test(layoutSrc)) {
  add('ok', 'Search-engine verification present.')
  if (/TODO|your-google|your-.*-code/i.test((layoutSrc.match(/verification\s*:\s*\{[\s\S]*?\n\s*\}/) || [''])[0])) {
    add('warn', 'Verification contains placeholder codes — replace with real ones or remove before shipping.')
  }
  if (!/msvalidate\.01/.test(layoutSrc)) add('info', "No Bing verification (`other: { 'msvalidate.01': '…' }`). Bing also feeds other engines and AI assistants.")
} else {
  add('warn', 'No `verification` — needed for Google Search Console (or verify via DNS and ignore this).')
}
if (/yahoo\s*:/.test(layoutSrc)) add('warn', '`verification.yahoo` is obsolete — remove it.')
if (/keywords\s*:/.test(layoutSrc)) add('info', '`keywords` is ignored by Google since 2009 — harmless but pointless.')
if (/msapplication/.test(layoutSrc)) add('info', '`msapplication-*` tags are legacy (Windows 8 tiles) — safe to remove.')
if (/appLinks\s*:/.test(layoutSrc)) add('info', '`appLinks` present — keep only if a native app actually ships.')

// 9. JSON-LD
const ldFiles = allSrcFiles.filter((f) => /application\/ld\+json/.test(codeOf(f)))
if (!ldFiles.length) add('warn', 'No JSON-LD structured data found. Add Organization + WebSite (+ SoftwareApplication/Product) on the home page.')
else {
  add('ok', `JSON-LD found in: ${ldFiles.map(rel).join(', ')}.`)
  for (const f of ldFiles) {
    const src = codeOf(f)
    if (/dangerouslySetInnerHTML/.test(src) && !/u003c/.test(src)) add('warn', `${rel(f)}: JSON-LD is not escaped — use JSON.stringify(data).replace(/</g, '\\\\u003c').`)
  }
  const allLd = ldFiles.map(codeOf).join('\n') + allSrcFiles.filter((f) => /JsonLd|jsonLd/.test(codeOf(f))).map(codeOf).join('\n')
  if (!/['"]Organization['"]/.test(allLd)) add('info', 'No `Organization` schema found.')
  if (/aggregateRating/.test(allLd)) add('info', '`aggregateRating` present — make sure ratings are real and visible on the page.')
}

// 10. Sitemap + robots.txt
const sitemap = findInApp(/^sitemap\.(ts|js|xml)$/)
const robotsFile = findInApp(/^robots\.(ts|js|txt)$/)
sitemap ? add('ok', `Sitemap: ${rel(sitemap)}.`) : add('error', 'No app/sitemap.ts — search engines will discover pages slowly.')
robotsFile ? add('ok', `robots: ${rel(robotsFile)}.`) : add('error', 'No app/robots.ts.')
if (robotsFile && !/sitemap/.test(read(robotsFile))) add('warn', 'robots.txt does not reference the sitemap.')
if (robotsFile && /disallow\s*:\s*['"]\/['"]/.test(codeOf(robotsFile)) && !/isProd|production|VERCEL_ENV|NODE_ENV/.test(read(robotsFile))) {
  add('error', 'robots disallows "/" unconditionally — the whole site is blocked from crawling.')
}
for (const n of ['sitemap.xml', 'robots.txt']) {
  if (exists(path.join(publicDir, n)) && (n === 'sitemap.xml' ? sitemap : robotsFile)) {
    add('warn', `public/${n} conflicts with the generated app/ route — delete the static file.`)
  }
}

if (Number.isFinite(nextMajor) && nextMajor >= 15) {
  const syncParams = pageFiles.filter((f) => {
    const src = codeOf(f)
    return /generateMetadata\s*\(\s*\{\s*params\s*\}\s*:\s*\{\s*params\s*:\s*\{/.test(src)
  })
  if (syncParams.length) add('warn', `Next ${nextMajor}: params is a Promise — await it in generateMetadata: ${syncParams.map(rel).join(', ')}`)
}
} // end auditNext

// =====================================================================
// React without Next.js (Vite / CRA SPA, or React Router v7 framework mode)
// =====================================================================
function auditReact() {
  const reactMajor = majorOf(deps.react)
  const rrFramework = Boolean(deps['@react-router/dev'] || deps['@remix-run/dev'])
  const tool = rrFramework ? 'React Router framework mode' : deps.vite ? 'Vite' : deps['react-scripts'] ? 'Create React App' : 'unknown bundler'
  add('info', `Framework: React ${deps.react} (${tool})`)

  const srcDirs = ['src', 'app'].map((d) => path.join(root, d)).filter(exists)
  const srcFiles = srcDirs.flatMap((d) => walk(d)).filter((f) => /\.(t|j)sx?$|\.mjs$/.test(f))
  const codeOf = (f) => stripComments(read(f))
  const allCode = srcFiles.map((f) => [f, codeOf(f)])
  const anyCode = (re) => allCode.some(([, c]) => re.test(c))
  const publicDir = path.join(root, 'public')

  // Hash routing kills indexing in any React setup
  const hashFiles = allCode.filter(([, c]) => /\b(HashRouter|createHashRouter|createHashHistory)\b/.test(c)).map(([f]) => rel(f))
  if (hashFiles.length) add('error', `Hash routing (${hashFiles.join(', ')}): Google ignores everything after '#'. Use BrowserRouter / createBrowserRouter.`)

  // Zoom blocking anywhere
  for (const [f, c] of allCode) {
    if (/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0)?\b/.test(c)) add('error', `${rel(f)}: viewport blocks zoom (accessibility). Allow pinch-zoom.`)
  }

  // JSON-LD escaping (shared)
  const ldFiles = allCode.filter(([, c]) => /application\/ld\+json/.test(c))
  for (const [f, c] of ldFiles) {
    if (/dangerouslySetInnerHTML/.test(c) && !/u003c/.test(c)) add('warn', `${rel(f)}: JSON-LD is not escaped — use JSON.stringify(data).replace(/</g, '\\\\u003c').`)
  }

  if (rrFramework) return auditReactRouterFramework({ allCode, anyCode, publicDir, ldFiles })

  // ---------- SPA: index.html ----------
  const indexHtml = [path.join(root, 'index.html'), path.join(publicDir, 'index.html')].find(exists)
  if (!indexHtml) { add('error', 'No index.html found (root for Vite, public/ for CRA).'); return }
  add('info', `index.html: ${rel(indexHtml)}`)
  const html = read(indexHtml).replace(/<!--[\s\S]*?-->/g, '')
  const head = (html.match(/<head[^>]*>([\s\S]*?)<\/head>/i) || [, html])[1]
  const metaTag = (attr, name) => {
    const re = new RegExp(`<meta[^>]*${attr}\\s*=\\s*["']${name.replace(/[.:]/g, '\\$&')}["'][^>]*>`, 'gi')
    return head.match(re) || []
  }
  const contentOf = (tag) => (tag?.match(/content\s*=\s*["']([^"']*)["']/i) || [])[1]

  // 1. Viewport
  const vp = metaTag('name', 'viewport')[0]
  if (!vp) add('error', 'index.html has no viewport meta tag.')
  else if (/maximum-scale\s*=\s*1(\.0)?\b|user-scalable\s*=\s*no/.test(vp)) add('error', 'Viewport blocks zoom — use maximum-scale=5.')
  else add('ok', 'Viewport meta present.')
  metaTag('name', 'theme-color').length ? add('ok', 'theme-color present.') : add('info', 'No theme-color meta (optional; colors the mobile address bar).')

  // 2. Title / description
  const titleTag = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (!titleTag || !titleTag[1].trim()) add('error', 'index.html has no <title>.')
  else {
    const t = titleTag[1].trim()
    if (/^(Vite \+ React( \+ TS)?|React App)$/i.test(t)) add('error', `index.html title is the scaffold default ("${t}").`)
    else add('ok', `Default title: "${t}"${t.length > 60 ? ` (${t.length} chars, may be truncated)` : ''}.`)
  }
  const desc = contentOf(metaTag('name', 'description')[0])
  if (!desc) add('error', 'index.html has no meta description.')
  else if (/Web site created using create-react-app/i.test(desc)) add('error', 'Meta description is the CRA default.')
  else if (desc.length > 160) add('warn', `Default description is ${desc.length} chars (>160).`)
  else add('ok', 'Default description present.')
  if (metaTag('name', 'keywords').length) add('info', 'meta keywords is ignored by Google — harmless but pointless.')

  // Head management per route
  const hasHelmetAsync = Boolean(deps['react-helmet-async'])
  const usesNativeHead = reactMajor >= 19 && anyCode(/<title>|<title\s*\{|<title\s/)
  if (deps['react-helmet'] && !hasHelmetAsync) add('warn', '`react-helmet` is unmaintained and not concurrent-safe. Use React 19 native <title>/<meta> or react-helmet-async.')
  if (!hasHelmetAsync && !usesNativeHead && !deps['react-helmet'] && !anyCode(/document\.title\s*=/)) {
    add('warn', `No per-route head management found. ${reactMajor >= 19 ? 'Render <title>/<meta>/<link> in route components (React 19 hoists them).' : 'Add react-helmet-async.'} Every route currently shares one title.`)
  } else add('ok', 'Per-route head management in use.')
  const defaultsMarked = /data-seo-default/.test(head)
  if ((hasHelmetAsync || usesNativeHead) && titleTag && !defaultsMarked && !anyCode(/data-seo-default|data-rh/)) {
    add('warn', 'index.html default <title>/description are not marked for removal — routes that render their own will produce duplicate tags. Mark them data-seo-default and call removeSeoDefaults() at startup.')
  }

  // 3. Canonical
  if (/<link[^>]*rel\s*=\s*["']canonical["']/i.test(head)) add('error', 'index.html hard-codes a canonical. Every SPA route is served this file, so every page claims to be that URL. Set canonical per route instead.')
  if (metaTag('property', 'og:url').length && !/og:url[^>]*data-seo-default|data-seo-default[^>]*og:url/.test(head)) add('warn', 'index.html hard-codes og:url — every route will report the same URL to crawlers that don\'t run JS. Set it per route.')
  if (anyCode(/rel\s*=\s*["']canonical["']|rel:\s*['"]canonical['"]|canonical/)) add('ok', 'Per-route canonical code found.')
  else add('warn', 'No per-route canonical found.')
  if ((deps['react-i18next'] || deps.i18next || deps['react-intl']) && !anyCode(/hrefLang|hreflang/)) add('warn', 'Project looks multilingual but no hreflang links were found.')

  // 4. Robots / private routes / 404
  const robotsMeta = contentOf(metaTag('name', 'robots')[0])
  if (robotsMeta && /noindex/.test(robotsMeta)) add('error', 'index.html has robots noindex — the whole site is hidden from search.')
  else if (robotsMeta && /max-image-preview:large/.test(robotsMeta)) add('ok', 'Default robots meta with max-image-preview:large.')
  else add('warn', 'No default robots meta with max-image-preview:large in index.html.')
  const privateRoutes = [...new Set(allCode.flatMap(([, c]) => [...c.matchAll(/path\s*[:=]\s*\{?\s*['"`](\/?(dashboard|settings|account|admin|checkout|billing|profile|login|signin|signup|register|onboarding)[^'"`]*)['"`]/gi)].map((m) => m[1])))]
  if (privateRoutes.length && !anyCode(/noindex/)) add('warn', `Private-looking routes (${privateRoutes.join(', ')}) but no noindex anywhere in the code.`)
  if (anyCode(/path\s*[:=]\s*\{?\s*['"]\*['"]/) && !anyCode(/noindex/)) add('warn', 'Catch-all "*" route exists but nothing renders noindex — SPA hosts return 200 for unknown URLs (soft 404s).')

  // 5/6. Open Graph + X
  const ogImage = contentOf(metaTag('property', 'og:image')[0])
  if (!ogImage) add('warn', 'index.html has no og:image — shared links show no preview image.')
  else if (!/^https?:\/\//.test(ogImage)) add('error', `og:image must be an absolute URL (got "${ogImage}").`)
  else add('ok', 'Default og:image (absolute).')
  if (!metaTag('property', 'og:title').length) add('warn', 'index.html has no og:title.')
  if (ogImage && !metaTag('property', 'og:image:width').length) add('info', 'Add og:image:width=1200 / og:image:height=630 / og:image:alt.')
  if (metaTag('name', 'og:image').length || metaTag('name', 'og:title').length) add('warn', 'Open Graph tags use name= — they must use property=.')
  metaTag('name', 'twitter:card').length ? add('ok', 'twitter:card present.') : add('warn', 'No twitter:card (summary_large_image) in index.html.')

  // 7. Icons + manifest
  const hasLink = (re) => new RegExp(`<link[^>]*rel\\s*=\\s*["'][^"']*${re}[^"']*["']`, 'i').test(head)
  hasLink('icon') ? add('ok', 'Favicon link present.') : add('warn', 'No <link rel="icon"> in index.html.')
  hasLink('apple-touch-icon') ? add('ok', 'Apple touch icon linked.') : add('warn', 'No apple-touch-icon (180×180) linked.')
  hasLink('manifest') ? add('ok', 'Manifest linked.') : add('warn', 'No web app manifest linked.')
  for (const m of head.matchAll(/<link[^>]*href\s*=\s*["'](\/[^"'?#]+)["'][^>]*>/gi)) {
    if (/rel\s*=\s*["'](icon|apple-touch-icon|manifest|shortcut icon)["']/i.test(m[0]) && !exists(path.join(publicDir, m[1]))) {
      add('warn', `index.html links ${m[1]} but public${m[1]} does not exist.`)
    }
  }

  // 8. Verification
  if (metaTag('name', 'google-site-verification').length) {
    add('ok', 'Google verification present.')
    if (/TODO|your-/i.test(contentOf(metaTag('name', 'google-site-verification')[0]) || '')) add('warn', 'Google verification is a placeholder — replace or remove.')
  } else add('warn', 'No google-site-verification meta (or verify via DNS and ignore this).')
  if (!metaTag('name', 'msvalidate.01').length) add('info', 'No Bing verification (msvalidate.01).')
  if (anyCode(/google-site-verification/) && !metaTag('name', 'google-site-verification').length) {
    add('error', 'Verification meta is rendered from JS — verification bots do not run JS. Put it in index.html.')
  }

  // 9. JSON-LD
  const staticLd = /<script[^>]*application\/ld\+json/i.test(head) || /<script[^>]*application\/ld\+json/i.test(html)
  if (staticLd) add('ok', 'Static JSON-LD in index.html (visible without JS).')
  else if (ldFiles.length) add('info', 'JSON-LD only rendered from JS — move site-wide Organization/WebSite into index.html so every crawler sees it.')
  else add('warn', 'No JSON-LD found. Add Organization + WebSite to index.html.')

  // 10. Sitemap + robots.txt
  const scripts = Object.values(pkg.scripts || {}).join(' ')
  const sitemapGen = /sitemap/i.test(scripts) || deps['vite-plugin-sitemap'] || deps['react-router-sitemap']
  const pubSitemap = exists(path.join(publicDir, 'sitemap.xml'))
  const pubRobots = exists(path.join(publicDir, 'robots.txt'))
  if (sitemapGen) add('ok', 'Sitemap generated at build.')
  else if (pubSitemap) add('ok', 'public/sitemap.xml present (static — keep it in sync with routes).')
  else add('error', 'No sitemap — add scripts/generate-sitemap.mjs as a postbuild step.')
  if (pubRobots) {
    const r = read(path.join(publicDir, 'robots.txt'))
    if (/^\s*Disallow:\s*\/\s*$/m.test(r) && !/Allow:\s*\/\s*$/m.test(r)) add('error', 'public/robots.txt disallows "/" — the whole site is blocked.')
    if (!/sitemap:/i.test(r)) add('warn', 'public/robots.txt does not reference the sitemap.')
    if (sitemapGen && /robots/i.test(scripts)) add('warn', 'public/robots.txt AND a generated robots.txt — keep one source.')
    else add('ok', 'robots.txt present.')
  } else if (!/robots/i.test(scripts) && !sitemapGen) add('error', 'No robots.txt.')

  // Rendering strategy
  const prerender = ['vite-prerender-plugin', 'vite-plugin-prerender', 'vike', 'react-snap', '@prerenderer/rollup-plugin', 'vite-plugin-ssr', 'vite-react-ssg', 'react-static'].find((d) => deps[d])
  if (prerender === 'react-snap') add('warn', 'react-snap is unmaintained — consider React Router framework-mode prerender or Vike.')
  if (prerender) add('ok', `Prerender/SSR via ${prerender}.`)
  else add('warn', 'Pure client-side SPA: social platforms and AI crawlers (no JS) see only index.html, so every route shares the homepage title/preview. Prerender public routes if they need their own previews.')
}

function auditReactRouterFramework({ allCode, anyCode, publicDir }) {
  const appDir = path.join(root, 'app')
  const rootFile = ['root.tsx', 'root.jsx'].map((n) => path.join(appDir, n)).find(exists)
  const rootSrc = rootFile ? stripComments(read(rootFile)) : ''
  if (!rootFile) { add('error', 'No app/root.tsx found.'); return }

  if (/<Meta\s*\/>/.test(rootSrc) && /<Links\s*\/>/.test(rootSrc)) add('ok', 'root renders <Meta /> and <Links />.')
  else add('error', 'app/root.tsx must render <Meta /> and <Links /> in <head>.')
  if (/name=["']viewport["']/.test(rootSrc)) add('ok', 'Viewport in root.')
  else add('error', 'No viewport meta in app/root.tsx.')
  if (/maximum-scale\s*=\s*1(\.0)?\b|user-scalable\s*=\s*no/.test(rootSrc)) add('error', 'Viewport blocks zoom.')

  const routeFiles = allCode.filter(([f]) => f.includes(`${path.sep}routes${path.sep}`) && /\.(t|j)sx$/.test(f))
  const withoutMeta = routeFiles.filter(([, c]) => !/export\s+(const|function|async\s+function)\s+meta\b/.test(c) && /export\s+default/.test(c)).map(([f]) => rel(f))
  if (withoutMeta.length) add('warn', `Route modules without a meta export (inherit root meta, same title as parent): ${withoutMeta.join(', ')}`)
  else if (routeFiles.length) add('ok', 'Every route module exports meta.')
  if (anyCode(/rel:\s*['"]canonical['"]/)) add('ok', 'Canonical link descriptors found.')
  else add('warn', "No canonical — add { tagName: 'link', rel: 'canonical', href } to each route's meta.")
  if (/rel:\s*['"]canonical['"]/.test(rootSrc) && !/seoMeta\s*\(/.test(rootSrc)) add('warn', 'Canonical in root meta applies to every route without its own meta.')
  if (!anyCode(/max-image-preview/)) add('warn', "No robots meta with 'max-image-preview:large'.")
  if (!anyCode(/og:image/)) add('warn', 'No og:image in any meta.')
  if (!anyCode(/twitter:card/)) add('warn', 'No twitter:card in any meta.')
  if (!anyCode(/google-site-verification/)) add('warn', 'No google-site-verification (or verify via DNS).')
  if (!anyCode(/script:ld\+json|application\/ld\+json/)) add('warn', 'No JSON-LD (use { "script:ld+json": {...} } in meta).')
  if (!/rel:\s*['"](icon|apple-touch-icon)['"]|rel=["']icon["']/.test(rootSrc) && !exists(path.join(publicDir, 'favicon.ico'))) add('warn', 'No favicon.')
  if (!/manifest/.test(rootSrc)) add('warn', 'No manifest link in root links.')

  const sitemapRoute = allCode.some(([f]) => /sitemap(\[\.\]|\.)xml/.test(f)) || exists(path.join(publicDir, 'sitemap.xml'))
  const robotsRoute = allCode.some(([f]) => /robots(\[\.\]|\.)txt/.test(f)) || exists(path.join(publicDir, 'robots.txt'))
  sitemapRoute ? add('ok', 'Sitemap present.') : add('error', 'No sitemap (add app/routes/sitemap[.]xml.ts).')
  robotsRoute ? add('ok', 'robots.txt present.') : add('error', 'No robots.txt (add app/routes/robots[.]txt.ts).')

  const cfg = ['react-router.config.ts', 'react-router.config.js'].map((n) => path.join(root, n)).find(exists)
  const cfgSrc = cfg ? stripComments(read(cfg)) : ''
  if (/ssr\s*:\s*false/.test(cfgSrc) && !/prerender/.test(cfgSrc)) add('warn', 'ssr: false without prerender = client-only SPA; crawlers without JS see an empty shell.')
  else if (/prerender/.test(cfgSrc)) add('ok', 'Prerender configured.')
  else add('ok', 'SSR enabled (default).')
}

function report() {
  const icon = { error: '✗ ERROR', warn: '! WARN ', ok: '✓ OK   ', info: '· INFO ' }
  console.log(`\nSEO audit —${root}\n`)
  for (const level of ['error', 'warn', 'ok', 'info']) {
    for (const msg of results[level]) console.log(`${icon[level]}  ${msg}`)
  }
  console.log(`\n${results.error.length} error(s), ${results.warn.length} warning(s), ${results.ok.length} ok\n`)
  process.exit(results.error.length ? 1 : 0)
}
