# React (without Next.js) SEO reference

Covers React apps built with **Vite** or **Create React App**, using either client-side routing (React Router library mode, TanStack Router, wouter) or **React Router v7 framework mode** (formerly Remix).

**Why** each tag matters is the same as in Next.js. See `nextjs-reference.md` for the reasoning behind each field. This file covers **how to do it in React** and the problems that only single-page apps (SPAs) have.

## Contents
0. The core problem: client-side rendering
1. Viewport
2. Title and description (head management)
3. Canonical and hreflang
4. Robots meta, soft 404s, preview deployments
5. Open Graph
6. X / Twitter cards
7. Icons and manifest
8. Verification, format detection, app links
9. JSON-LD
10. Sitemap and robots.txt
11. React Router v7 framework mode
12. Verifying what crawlers actually see
13. Optional: llms.txt and llms-full.txt

---

## 0. The core problem: client-side rendering

A Vite or CRA SPA ships one `index.html` with an empty `<div id="root">`. Everything else is rendered by JavaScript.

| Crawler | Runs JS? | What it sees on `/pricing` of a plain SPA |
|---|---|---|
| Googlebot | Yes, in a delayed second "render" pass with a limited budget | Your per-route tags, eventually |
| Bingbot | Partially, unreliably | Often only `index.html` |
| LinkedIn, Facebook, X, Slack, WhatsApp, Discord, iMessage | **No** | Only `index.html`, so every route shows the homepage preview |
| Most AI crawlers (GPTBot, ClaudeBot, PerplexityBot…) | **No** | Only `index.html` and an empty root div |

So tags set with JavaScript reach Google and nobody else. Pick a strategy based on what the public pages are:

| Situation | Strategy |
|---|---|
| App is behind a login; only the landing page needs SEO | Good `index.html` defaults + a head manager for titles. Consider building the landing page separately as a static site. |
| Marketing pages, blog or docs built in React | **Prerender** every public route to static HTML at build time |
| Many dynamic public pages (products, listings, user content) | **SSR**: React Router v7 framework mode with SSR, Vike, or migrate to Next.js |

**Prerendering options**
- **React Router v7 framework mode**: `prerender` in `react-router.config.ts` (section 11). Best choice if the app already uses React Router.
- **Vike** (the successor to vite-plugin-ssr): prerender or SSR for Vite + React.
- A Vite prerender plugin such as `vite-prerender-plugin`, or a headless-browser prerender step. Check the package is maintained before adopting it. Avoid `react-snap`, which is unmaintained.

Whatever the strategy, also use `BrowserRouter`/`createBrowserRouter`, **never `HashRouter`**. Google ignores everything after `#`, so `/#/pricing` is just the homepage to a crawler.

Always tell the user which strategy you chose, and if they stay a pure SPA, say plainly what that costs: social previews and AI crawlers will only see the homepage defaults.

## 1. Viewport

Put it in `index.html` (Vite: project root; CRA: `public/index.html`):

```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
```
Never `maximum-scale=1` or `user-scalable=no`.

## 2. Title and description (head management)

React has no `metadata` object, so you need a way to set head tags per route:

- **React 19+:** render `<title>`, `<meta>` and `<link>` anywhere in a component, and React moves them into `<head>` for you. No library needed.
- **React 18:** use `react-helmet-async` (`<HelmetProvider>` at the root, `<Helmet>` per route). Don't use the original `react-helmet`; it's unmaintained and not concurrent-safe.

Use the `Seo` component in `templates/react/src/seo/` (one version for React 19, one for Helmet). It:
- builds a "Page | Brand" title, since React has no `title.template`
- sets description, canonical, hreflang, robots, Open Graph and X tags from one set of props
- turns relative paths into absolute URLs, since there's no `metadataBase`

**Rules**
- Render exactly one `<Seo>` per route, usually at the top of the route component. Every route needs one.
- Titles ~50–60 chars, descriptions ≤ ~160, unique per page.
- **Duplicate-tag trap:** neither React 19 nor Helmet removes tags already in `index.html`. If `index.html` has a default `<title>` and description, and a route renders its own, the page ends up with two. Fix: mark every route-specific default in `index.html` with `data-seo-default` and remove those tags at startup (`removeSeoDefaults()` in `main.tsx`, see template). Crawlers that don't run JS still see the defaults. Google and prerendered HTML see only the route's tags.
- Keep tags that are the same on every page in `index.html` permanently, without the marker: charset, viewport, theme-color, icons, manifest, verification, `og:site_name`, `og:locale`, `twitter:card`, `twitter:site`, the default robots tag, and site-wide JSON-LD.
- Skip `<meta name="keywords">`.

## 3. Canonical and hreflang

```html
<link rel="canonical" href="https://example.com/pricing" />
<link rel="alternate" hreflang="en-US" href="https://example.com/en-US/pricing" />
<link rel="alternate" hreflang="es-ES" href="https://example.com/es-ES/pricing" />
<link rel="alternate" hreflang="x-default" href="https://example.com/pricing" />
```

- Set the canonical **per route** through `<Seo path="/pricing">`, as an absolute URL.
- **Never hard-code a canonical in `index.html`.** Every route of an SPA is served that same file, so every page would claim to be the homepage. This is the SPA version of the "canonical in the root layout" mistake.
- Build the canonical from a clean path: no query string, no hash, and one consistent trailing-slash rule. Don't use `window.location.href` as is, because tracking parameters would end up in it.
- hreflang must be reciprocal and include `x-default`. React's prop is `hrefLang`.
- Don't add a canonical to noindex pages.

## 4. Robots meta, soft 404s, preview deployments

Keep a permanent default in `index.html`:
```html
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
```
Private routes (dashboard, settings, account, admin, checkout, auth) render `<Seo noindex />`, which adds `<meta name="robots" content="noindex, nofollow">`. When a page has two robots tags, Google follows the most restrictive, so the default doesn't need removing. Put it once in the private area's layout route so every child inherits it.

**Soft 404s:** SPA hosting rewrites every unknown URL to `index.html` with HTTP **200**, so Google indexes junk URLs as real pages.
- The catch-all "not found" route must render `<Seo noindex title="Page not found" />`.
- Better: when prerendering, emit a real `404.html` and configure the host to serve it with status 404 for unknown paths (Netlify, Cloudflare Pages and Vercel each have a setting or convention for this). With SSR, return a real 404 status.

**Preview/staging deployments:** keep them out of the index with an `X-Robots-Tag: noindex` header or a `robots.txt` that disallows everything on non-production hosts. Some hosts (e.g. Vercel preview URLs) add this automatically. Check the user's host.

## 5. Open Graph

Note that Open Graph uses `property=`, not `name=`. Every URL must be **absolute**.

```html
<meta property="og:site_name" content="Your App Name" />
<meta property="og:locale" content="en_US" />
<meta property="og:type" content="website" data-seo-default />
<meta property="og:title" content="Your App Name — The Ultimate Solution" data-seo-default />
<meta property="og:description" content="…" data-seo-default />
<meta property="og:image" content="https://example.com/og-image.png" data-seo-default />
<meta property="og:image:width" content="1200" data-seo-default />
<meta property="og:image:height" content="630" data-seo-default />
<meta property="og:image:alt" content="App preview" data-seo-default />
```
- Image 1200 × 630, PNG/JPG, not SVG.
- Leave `og:url` out of `index.html` defaults. On an un-prerendered SPA it would say "homepage" on every route. `<Seo>` sets it per route.
- **Per-route previews only reach social platforms if the route is prerendered or server-rendered** (section 0).
- Per-post images: generate them at build time with `satori` + `@resvg/resvg-js` (the same engine `next/og` uses), or serve them from an OG-image endpoint (e.g. `@vercel/og` on a serverless function). Otherwise, use one good default image.
- Blog posts: `og:type` = `article`, plus `article:published_time`, `article:modified_time`, `article:author`.

## 6. X / Twitter cards

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@your_company" />
<meta name="twitter:creator" content="@your_author" />
```
X falls back to `og:title`, `og:description` and `og:image`, so these three are usually enough.

## 7. Icons and manifest

Files go in `public/`, with links in `index.html`:
```html
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="icon" href="/icon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />  <!-- 180×180, no transparency -->
<link rel="manifest" href="/manifest.webmanifest" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-title" content="Your App Name" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```
- Manifest template: `templates/react/public/manifest.webmanifest`. `vite-plugin-pwa` can generate the manifest and icons if the user wants a full PWA.
- CRA already ships `public/manifest.json` and `logo192.png`/`logo512.png`. Update the name, colors and icons instead of adding a second manifest.
- Don't link icon files that don't exist. Tell the user which files and sizes to add.

## 8. Verification, format detection, app links

```html
<meta name="google-site-verification" content="CODE" />
<meta name="msvalidate.01" content="BING_CODE" />
<meta name="yandex-verification" content="CODE" />
<meta name="facebook-domain-verification" content="CODE" />
<meta name="format-detection" content="telephone=no, email=no, address=no" />
```
These must be in static `index.html` (or SSR output). Verification bots don't run JS. Only include codes the user actually has; a DNS TXT record also works. Skip Yahoo, which no longer exists.

App links, only if a native app ships:
```html
<meta property="al:ios:url" content="https://example.com/ios" />
<meta property="al:ios:app_store_id" content="123456789" />
<meta property="al:android:package" content="com.example.app" />
<meta property="al:android:app_name" content="Your App Name" />
<meta name="apple-itunes-app" content="app-id=123456789" />  <!-- Safari Smart App Banner -->
```

## 9. JSON-LD

- **Site-wide `Organization` + `WebSite`:** put them **inline in `index.html`** as a static `<script type="application/ld+json">`. Then every crawler sees them, with no JS needed.
- **Per-page types** (`Article`, `Product`, `BreadcrumbList`, `SoftwareApplication`): render them with `templates/react/src/seo/JsonLd.tsx`, which escapes `<` as `<`. Without prerendering, only Google's renderer sees them.
- Same rules as Next.js: absolute URLs, link entities with `@id`, only mark up what's visible, and no fake ratings. Type them with `schema-dts`.

## 10. Sitemap and robots.txt

Vite and CRA don't generate these, so produce them at build time:
- `templates/react/scripts/generate-sitemap.mjs` writes `sitemap.xml` **and** `robots.txt` into the build folder (`dist/` for Vite, `build/` for CRA) from a route list plus your data source. Wire it up as `"postbuild": "node scripts/generate-sitemap.mjs"`.
- Use one source of truth. If the project already has a hand-written `public/robots.txt` or `public/sitemap.xml`, either keep it and update it, or delete it and use the script. Never ship both.
- Include only public, indexable, canonical URLs, with real `lastmod` dates.
- Read the site URL from the same env var the app uses (`VITE_SITE_URL` / `REACT_APP_SITE_URL`). Plain Node scripts don't load `.env` automatically, so pass it from CI or use `node --env-file=.env` (Node 20.6+).
- Submit `/sitemap.xml` in Google Search Console and Bing Webmaster Tools.

## 11. React Router v7 framework mode

You get real HTML per route (SSR or prerendered), so most SPA problems go away. Templates are in `templates/react/react-router-framework/`.

- **Head:** `app/root.tsx` renders `<Meta />` and `<Links />` in `<head>`. Viewport and charset go there as static tags. Icons and the manifest go in the root `links` export.
- **Per-route metadata:** each route exports `meta`, which returns an array of tag descriptors:
  - `{ title }` and `{ name, content }`
  - `{ property: 'og:…', content }`
  - `{ tagName: 'link', rel: 'canonical', href }`
  - `{ 'script:ld+json': {...} }` (React Router escapes it)
- **The merging trap:** the deepest route's `meta` **replaces** all parent meta. Nothing is merged. Site-wide tags (verification, `twitter:site`, the default robots tag) are lost unless every route includes them. Use the `seoMeta()` helper in `app/lib/seo.ts`, which always adds the site-wide tags. Alternatively, put tags that never change as static elements in `root.tsx`'s `<head>`.
- **Dynamic routes:** `meta` receives `{ data, params, matches }`. Build the title, canonical and OG tags from the loader's `data`. If `data` is missing (404), return a noindex tag. Throw `new Response('Not Found', { status: 404 })` from the loader so the status code is real.
- **Prerender:** in `react-router.config.ts`, set `prerender: true` for all static paths, or use `async prerender({ getStaticPaths })` to add dynamic URLs from your data.
- **Sitemap / robots:** add resource routes `app/routes/sitemap[.]xml.ts` and `app/routes/robots[.]txt.ts` that return a `Response` with the right `Content-Type`. Add them to `prerender` if the site is fully static. If routes are listed in `app/routes.ts` rather than discovered from file names, register them there too.

## 12. Verifying what crawlers actually see

- Build, then serve the build (`npx vite preview`, or `npx serve dist` / `npx serve -s build`).
- Check the **raw HTML** with `curl -s http://localhost:4173/pricing` or view-source, **not** the DevTools Elements panel, which shows the DOM after JS has run. The raw HTML is what social and AI crawlers get.
- For prerendered/SSR routes, every public route's raw HTML should contain its own `<title>`, description, canonical and OG tags. For a pure SPA, confirm the `index.html` defaults are correct and there's no hard-coded canonical.
- With JS running, confirm there's exactly one `<title>`, one description and one canonical per route (the duplicate-tag trap).
- After deploying, use Search Console's **URL Inspection → View crawled page** to see Google's rendered HTML. Also run the Rich Results Test, the LinkedIn Post Inspector and the Facebook Sharing Debugger.

## 13. Optional: llms.txt and llms-full.txt

**Optional, not part of the SEO baseline.** Add it only if the user wants it. See `nextjs-reference.md` section 13 for the format and why it's optional.

- **Vite / CRA:** `templates/react/scripts/generate-llms.mjs` writes `llms.txt` and `llms-full.txt` into the build folder. Chain it after the sitemap: `"postbuild": "node scripts/generate-sitemap.mjs && node scripts/generate-llms.mjs"`. These are static files, so a pure SPA works fine and no prerendering is needed. Keep `NAME` / `DESCRIPTION` in sync with `src/seo/site.ts`.
- **React Router framework mode:** `app/lib/llms.ts` plus resource routes `app/routes/llms[.]txt.ts` and `app/routes/llms-full[.]txt.ts`. Add `/llms.txt` and `/llms-full.txt` to `prerender` for static sites, and register the routes in `app/routes.ts` if you don't use file-name routing.
- Same content rules as the sitemap: public pages only, Markdown/plain text, absolute canonical URLs. Use one source: either the generator or a hand-written `public/llms.txt`, not both.
