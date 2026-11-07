---
name: react-nextjs-seo
description: Set up, fix, or audit complete SEO for React apps — Next.js App Router, plain React SPAs (Vite, Create React App) and React Router v7 framework mode / Remix. Covers viewport and theme color, titles and descriptions, per-page canonical and hreflang, robots meta, Open Graph and X/Twitter cards, favicons/manifest/Apple web app, search-engine verification, format detection, app links, JSON-LD structured data (Schema.org), sitemap and robots.txt, optional llms.txt / llms-full.txt for AI assistants, plus SPA-specific problems (crawlers that don't run JS, prerendering, duplicate head tags, soft 404s, hash routing). Use whenever the user wants to "add SEO", make a React or Next.js site rank, fix link previews or social cards, add a sitemap/robots.txt, add structured data or rich results, use react-helmet or React 19 metadata, prepare a site for launch or Google Search Console, or audit existing metadata — even if they don't say "SEO" explicitly.
---

# React & Next.js SEO

Bring a React project to a complete, correct SEO baseline: every tag that matters, none of the ones that don't, and none of the common mistakes that silently de-index pages or break link previews.

The work has four phases: **inspect → gather facts → implement → verify**. Phases 1, 2 and 4 are the same for every framework. Phase 3 branches by framework. Don't skip inspection: most projects already have partial metadata, and the worst bugs (a site-wide canonical, a scaffold title, hash routing) come from what's already there.

## Phase 1 — Inspect the project

1. **Identify the framework** from `package.json`:
   | Signal | Track |
   |---|---|
   | `next` dependency + `app/` or `src/app/` | **A: Next.js App Router** |
   | `next` with only `pages/` | Pages Router: tell the user this skill targets the App Router. Offer the same principles via `next/head` + a sitemap generator, or a migration. |
   | `@react-router/dev` (or `@remix-run/dev`) | **B2: React Router v7 framework mode** |
   | `react` + `vite` or `react-scripts`, no `next` | **B1: React SPA** |
   Note versions. Next 15+ passes `params` to `generateMetadata` as a Promise. React 19+ moves `<title>`/`<meta>`/`<link>` into `<head>` natively; React 18 needs `react-helmet-async`.
2. **Run the bundled audit** for a baseline. It detects the framework, needs no dependencies and is read-only:
   ```bash
   node <skill-dir>/scripts/audit.mjs <project-root>
   ```
   It reports errors (things actively hurting SEO), warnings and missing pieces. Re-run it at the end.
3. **Map the routes** (Next: `page.tsx` files; SPA: the router config; RR framework: `app/routes`) and classify each one:
   - **Public / indexable**: home, pricing, blog, docs, landing pages.
   - **Private / no-index**: dashboard, settings, account, admin, checkout, auth, internal tools, the 404 page.
   - **Dynamic**: `[slug]` / `:slug` routes that need data-driven metadata.
4. Note what's already there: existing head tags or metadata, i18n setup, icon files, a manifest, a CMS/data source, a native mobile app, prerender/SSR tooling, and the hosting platform.

## Phase 2 — Gather the facts you can't infer

Pull from the codebase, README, `package.json`, existing copy and env vars first. Ask the user only for what's missing, in one batched question. Never invent verification codes, social handles, app-store IDs or ratings; leave a clearly marked `TODO` instead.

| Fact | Used for |
|---|---|
| Production URL (e.g. `https://example.com`) | absolute URLs, canonical, sitemap, robots, JSON-LD `@id`s |
| App / brand name, one-line tagline | title default + template, OG, manifest |
| Description (≤ ~160 chars, written for humans) | description, OG, X |
| Brand colors for light/dark | theme-color, manifest |
| Supported locales (if any) | hreflang |
| X handle(s) for company and author | `twitter:site`, `twitter:creator` |
| Search Console / Bing / Yandex / Facebook verification codes | verification |
| Organization legal name, logo URL, social profile URLs | JSON-LD `Organization` |
| What the product is (SaaS, product, articles…), pricing, real ratings | JSON-LD type choice |
| Native iOS/Android app details (only if one ships) | app links |
| **SPA only:** which routes must have their own social previews, and the host | rendering strategy, soft-404 setup |
| Whether they want `llms.txt` (optional, see below) | `llms.txt` / `llms-full.txt` |

Read the site URL from an env var (`NEXT_PUBLIC_SITE_URL`, `VITE_SITE_URL`, `REACT_APP_SITE_URL`, `SITE_URL`) with a hard-coded production fallback, so the canonical domain is defined in one place.

## Phase 3A — Implement: Next.js App Router

Rules, reasons and edge cases: `references/nextjs-reference.md`. Templates: `templates/nextjs/`.

1. **Viewport**: export `viewport: Viewport` from the root layout (never inside `metadata`, which is deprecated). `width: 'device-width'`, `initialScale: 1`, `maximumScale: 5`, light/dark `themeColor`. **Never** `maximumScale: 1` or `userScalable: false`.
2. **Basic identity** (root `metadata`): `metadataBase`, `title: { default, template: '%s | Brand' }`, `description`, `applicationName`. Skip `keywords`.
3. **Canonical + hreflang**: `alternates.canonical` **per page, never in the root layout**. Use `generateMetadata` for dynamic routes. Add `alternates.languages` with `x-default` if multilingual.
4. **Robots meta**: root sets index/follow + `googleBot` with `'max-image-preview': 'large'`, `'max-snippet': -1`, `'max-video-preview': -1`. Private segments set `robots: { index: false, follow: false }` in their layout. Gate indexing on production.
5. **Open Graph**: root defaults (`siteName`, `type`, `locale`, title, description) and per-page `url`/title/description. Images via `opengraph-image.(png|tsx)` (1200×630), generated per post for dynamic routes. Page-level `openGraph` **replaces** the parent's, so re-spread shared fields.
6. **X**: `card: 'summary_large_image'`, `site`, `creator`. The rest falls back to OG.
7. **Icons / manifest / Apple**: `app/favicon.ico`, `app/icon.(svg|png)`, `app/apple-icon.png` (180×180), `app/manifest.ts`, `appleWebApp`.
8. **Verification / format detection / app links**: `verification.google`, `other['msvalidate.01']`, never `yahoo`. `formatDetection` off for email/address/telephone. `appLinks` only if a native app ships.
9. **JSON-LD**: the `JsonLd` helper (escapes `<`). Home page gets `Organization` + `WebSite` (+ `SoftwareApplication`/`Product`) linked by `@id`. Posts get `Article`/`BlogPosting` + `BreadcrumbList`. Only real, visible ratings.
10. **Sitemap + robots**: `app/sitemap.ts` (public routes + dynamic entries, real `lastModified`) and `app/robots.ts` (disallow `/api/` and private areas, link the sitemap, block non-production).
11. *(Optional)* **llms.txt**: only if the user wants it. See "Optional — llms.txt" below. Templates: `lib/llms.ts`, `app/llms.txt/route.ts`, `app/llms-full.txt/route.ts`.

Keep shared values in `lib/site.ts` and use the `pageMetadata()` helper so canonical, OG url and shared OG fields are always set together.

## Phase 3B — Implement: React without Next.js

Rules, reasons and edge cases: `references/react-reference.md`. **Read section 0 there first.** Templates: `templates/react/`.

**Step 0: choose the rendering strategy and tell the user.** A client-only SPA serves one `index.html` for every route. Google eventually runs the JS. Social platforms (LinkedIn, Facebook, X, Slack, WhatsApp) and most AI crawlers don't, so they only ever see `index.html`.
- Only the landing page matters (app is behind a login) → stay an SPA with good `index.html` defaults.
- Public marketing/blog/docs routes need their own previews → **prerender** them (React Router framework mode `prerender`, Vike, or a maintained Vite prerender plugin).
- Many dynamic public pages → SSR (React Router framework mode or Vike) or migrate to Next.js.
Don't silently pick one. If the project stays a pure SPA, state clearly what social previews and AI crawlers will and won't see.

### B1 — Vite / CRA SPA

1. **`index.html` head** (`templates/react/index.html`). This is the only HTML crawlers that don't run JS will see, so it must be complete:
   - viewport (`maximum-scale=5`), light/dark theme-color
   - default `<title>` and description (replace scaffold defaults like "Vite + React" / "React App")
   - default robots meta with `max-image-preview:large`
   - OG and X defaults with **absolute** URLs (`property=` for OG)
   - icons, manifest, Apple tags, verification, format detection
   - **static site-wide JSON-LD** (Organization + WebSite)
   - **No canonical and no `og:url` here.** Every route is served this file.
   - Mark route-specific defaults with `data-seo-default`.
2. **Head management**: copy `templates/react/src/seo/` (`site.ts`, `Seo.tsx`, `JsonLd.tsx`). On React 18, use `Seo.helmet.tsx` with `react-helmet-async` instead (never the old `react-helmet`). Call `removeSeoDefaults()` in `main.tsx` before rendering to avoid duplicate title/description/OG tags.
3. **Every route renders exactly one `<Seo>`**: title (becomes "Title | Brand"), description, `path` (canonical + `og:url`, absolute and clean), optional image, `type="article"` with article dates, and `languages` for hreflang. See `templates/react/src/examples.tsx`.
4. **Private routes and the catch-all 404** render `<Seo noindex />` (in the layout route for private areas). Explain the soft-404 problem and the host-level fix.
5. **Routing**: `BrowserRouter`/`createBrowserRouter` only. Replace any `HashRouter`.
6. **Per-page JSON-LD** via `<JsonLd>`: `BlogPosting`/`Article`, `Product`, `BreadcrumbList`, `SoftwareApplication`.
7. **Icons and manifest** in `public/`. CRA already has `manifest.json`, so update it rather than adding a second one. Don't link files that don't exist; list what the user must add.
8. **Sitemap + robots.txt**: `templates/react/scripts/generate-sitemap.mjs` as a `postbuild` script (writes both into `dist/` or `build/`, disallow-all outside production). Use one source of truth: if a hand-written `public/robots.txt` exists, keep either it or the script, not both.
9. **Prerendering** if chosen in step 0. Then verify that each public route's built HTML contains its own tags.
10. *(Optional)* **llms.txt**: `templates/react/scripts/generate-llms.mjs` as an extra `postbuild` step, only if the user wants it.

### B2 — React Router v7 framework mode

Templates: `templates/react/react-router-framework/`.

1. `app/root.tsx`: static charset, viewport and theme-color in `<head>`, plus `<Meta />` and `<Links />`. Icons and manifest go in the root `links` export.
2. Every route exports `meta` returning `seoMeta({...})` from `app/lib/seo.ts`. The deepest route's meta **replaces** all parent meta, so the helper re-adds site-wide tags (robots default, verification, `twitter:site`, `og:site_name`). Canonical is `{ tagName: 'link', rel: 'canonical', href }`. JSON-LD is `{ 'script:ld+json': {...} }`.
3. Dynamic routes build meta from loader `data`. Missing data means the loader throws `new Response('Not Found', { status: 404 })` and `meta` returns a noindex.
4. Private routes return `seoMeta({ ..., noindex: true })`.
5. Resource routes `app/routes/sitemap[.]xml.ts` and `app/routes/robots[.]txt.ts`.
6. `react-router.config.ts`: keep SSR, or `prerender` public routes (including dynamic ones and the sitemap/robots routes).
7. *(Optional)* **llms.txt**: `app/lib/llms.ts` plus resource routes `llms[.]txt.ts` and `llms-full[.]txt.ts`, only if the user wants it. Add them to `prerender` if the site is static.

## Optional — llms.txt and llms-full.txt

[`llms.txt`](https://llmstxt.org) is a Markdown file at `/llms.txt` that gives LLMs a short summary of the site and links to its key pages. `llms-full.txt` holds the full text of those pages in one file. **They are optional, not part of the SEO baseline.** It's a community proposal, not a standard. Google and Bing don't use it for ranking, and the major AI crawlers don't reliably fetch it yet. It helps most on docs sites, developer tools and APIs, where coding agents and AI assistants read the docs directly.

- **Don't add it by default.** Mention it once as an optional extra and add it only if the user says yes. Never report a missing `llms.txt` as an error or warning, and never let it block the launch checklist.
- Same content rule as the sitemap: public, indexable pages only. `llms-full.txt` must contain Markdown or plain text, not rendered HTML, and never private content.
- Generate it from the same data source and `site` config as the sitemap, so it stays in sync.
- It doesn't replace prerendering, JSON-LD or good page content. AI search engines still mainly read the real pages.

## Phase 4 — Verify

1. Re-run `node <skill-dir>/scripts/audit.mjs <project-root>`. Resolve every error and explain any remaining warnings.
2. Type-check / build (`npx tsc --noEmit`, `next build`, `vite build`, `react-router build`).
3. Check what crawlers actually get:
   - **Next.js / SSR / prerendered:** fetch the built or served HTML (`curl -s <url>`, or view-source). Each public page should have its own title, description, a self-referencing canonical, and absolute OG image URLs.
   - **SPA:** `curl` the served `index.html` (that's what social and AI crawlers see) and confirm the defaults and that there's no canonical. Then check in a browser with JS that each route has exactly **one** title, description and canonical.
   - `/sitemap.xml`, `/robots.txt` and the manifest respond.
4. Finish with a short report: what was added/changed per section, the rendering strategy and its trade-offs (React), every `TODO` the user must fill in (verification codes, handles, icon files), and the launch checklist.

## Launch checklist (give this to the user)

- [ ] Viewport set, zoom not blocked
- [ ] Unique title (with brand template) and description on every public page
- [ ] Canonical set per page, never site-wide (root layout or `index.html`)
- [ ] Private pages and the 404 page set to noindex
- [ ] Open Graph image at 1200 × 630 px, absolute URL
- [ ] Favicon, Apple icon and manifest in place
- [ ] JSON-LD for the organization and product
- [ ] Sitemap and robots.txt live
- [ ] React SPA: rendering strategy decided; public routes prerendered if they need their own previews; no hash routing
- [ ] Site verified and sitemap submitted in Google Search Console (and Bing Webmaster Tools)
- [ ] *(Optional, not required for launch)* `/llms.txt` and `/llms-full.txt` live, if the user chose them

After deploying, test with:
- **Google Rich Results Test**: does the JSON-LD qualify for rich results?
- **Schema Markup Validator** (validator.schema.org): structured-data errors
- **LinkedIn Post Inspector** and **Facebook Sharing Debugger**: preview cards, and refreshing cached images
- **Lighthouse** (Chrome DevTools): SEO and accessibility scores
- **Google Search Console**: submit `https://<domain>/sitemap.xml`; use URL Inspection → "View crawled page" to see what Google rendered
