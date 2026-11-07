# Next.js SEO reference

Detailed rules for each section of the SKILL.md workflow. Each section: **what it is → why it matters → how to do it in the App Router → pitfalls**.

## Contents
1. Viewport
2. Basic SEO and identity
3. Canonical URLs and languages
4. Robots meta
5. Open Graph
6. X / Twitter cards
7. Icons, manifest, Apple web app
8. Verification, format detection, app links, `other`
9. Structured data (JSON-LD)
10. Sitemap and robots.txt
11. How metadata merges (read this before editing nested layouts)
12. Fields to skip
13. Optional: llms.txt and llms-full.txt

---

## 1. Viewport

**What:** tells mobile browsers to render at device width instead of a ~980px virtual canvas zoomed out.

**Why SEO:** Google uses mobile-first indexing — it ranks the mobile version of the page. Not mobile-friendly = disadvantaged.

**How:** export a separate `viewport` object from the root layout. Next.js renders the `<meta name="viewport">` and `<meta name="theme-color">` tags.

```tsx
import type { Viewport } from 'next'

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // keep pinch-zoom
}
```

**Pitfalls**
- Never `maximumScale: 1` or `userScalable: false` — blocks zoom for low-vision users; Lighthouse flags it.
- `viewport`, `themeColor` and `colorScheme` inside `metadata` are deprecated since Next 14. Move them to the `viewport` export.
- `viewport` can also be `generateViewport()` if it must be dynamic. Same segment can't export both `viewport` and `generateViewport`.

## 2. Basic SEO and identity

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://example.com'),
  title: {
    default: 'Your App Name — The Ultimate Solution',
    template: '%s | Your App Name',
  },
  description: 'What your app does and why users should care.',
  applicationName: 'Your App Name',
}
```

- **`title.template`**: a child page exporting `title: 'Pricing'` renders "Pricing | Your App Name". Templates apply to *child* segments, not the segment that defines them — that's why the root needs `default`. A page can opt out with `title: { absolute: 'Exact Title' }`.
- **Title length**: ~50–60 chars so Google doesn't truncate. Each page needs a unique title.
- **`description`**: the grey snippet text. ≤ ~160 chars, written as ad copy for humans — it drives click-through rate. Each important page should have its own.
- **`metadataBase`**: root URL. Lets every other field use relative paths (`/og-image.png`) that Next resolves to absolute URLs. OG, Twitter and canonical require absolute URLs, so always set it. Without it Next warns and falls back to `localhost` / Vercel URLs.
- Recommended: derive from env so previews work:
  ```ts
  export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com'
  ```

## 3. Canonical URLs and languages

**What:** the same page is reachable at many URLs (`www` vs apex, `?utm_*`, trailing slash). Google treats them as duplicates and splits ranking. `canonical` declares the one true URL.

```tsx
// app/pricing/page.tsx
export const metadata: Metadata = {
  title: 'Pricing',
  alternates: {
    canonical: '/pricing',
    languages: {
      'en-US': '/en-US/pricing',
      'es-ES': '/es-ES/pricing',
      'x-default': '/pricing',
    },
  },
}
```

Dynamic routes:
```tsx
// app/blog/[slug]/page.tsx  (Next 15+: params is a Promise)
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params
  return { alternates: { canonical: `/blog/${slug}` } }
}
```
On Next 13/14, `params` is a plain object: `({ params }: { params: { slug: string } })`.

**Pitfalls**
- **Never `canonical: '/'` (or any fixed canonical) in the root layout.** Every page inherits it → every page says "I'm a copy of the homepage" → pages drop out of the index. Set it per page. (A layout canonical is only OK when the layout wraps exactly one page.)
- Canonical must be self-referential for indexable pages, absolute after resolution (it will be, given `metadataBase`), and match the URL in the sitemap.
- `x-default` is easy to forget: the page shown to users whose language isn't supported.
- hreflang must be reciprocal: every language version lists all the others (including itself). Generate the map from your locale list rather than hand-writing it.
- With an i18n `[locale]` segment, build canonical and languages in `generateMetadata` from the locale param.
- Don't canonicalize paginated pages (`/blog?page=2`) to page 1; give each a self canonical.

## 4. Robots meta

```tsx
robots: {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1,
  },
},
```

- `max-image-preview: 'large'` lets Google show large images in Discover and image results — real traffic.
- Private pages (dashboard, settings, account, admin, checkout, auth, internal): `robots: { index: false, follow: false }` in the page or, better, in that segment's `layout.tsx` so every child inherits it.
- Optional safeguard: only allow indexing in production.
  ```ts
  const isProd = process.env.VERCEL_ENV ? process.env.VERCEL_ENV === 'production' : process.env.NODE_ENV === 'production'
  robots: isProd ? { index: true, follow: true, googleBot: {...} } : { index: false, follow: false }
  ```
- This emits a `<meta name="robots">` tag. It is **not** `robots.txt` (section 10).
- Subtlety: if `robots.txt` disallows a path, Google can't crawl it and therefore never sees its `noindex`; a disallowed URL can still be indexed (URL only) if linked externally. For auth-gated areas this is fine. For public pages you truly want out of results, use `noindex` and do **not** disallow them in robots.txt.

## 5. Open Graph

Preview cards on LinkedIn, Facebook, WhatsApp, Slack, Discord, iMessage. Not a ranking factor, but it decides click-through on shared links, which bring traffic and backlinks.

```tsx
openGraph: {
  type: 'website',
  siteName: 'Your App Name',
  locale: 'en_US',
  title: 'Your App Name — The Ultimate Solution',
  description: 'A compelling description for social feeds.',
  url: '/',
  images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'App preview' }],
},
```

- Image: **1200 × 630 px**, include `width`, `height`, `alt`. Keep under ~5 MB (PNG/JPG; avoid SVG — most platforms don't render it).
- `openGraph.url` per page, like canonical.
- Blog posts: `type: 'article'` with `publishedTime`, `modifiedTime`, `authors`, `tags`.
- **File convention (preferred):** `app/opengraph-image.png` (+ optional `opengraph-image.alt.txt`) in any route folder; Next adds the tags, including width/height. Or generate with `opengraph-image.tsx` using `ImageResponse` from `next/og` — ideal for per-post images with the post title. See `templates/nextjs/app/opengraph-image.tsx`. A `twitter-image.*` file works the same way for X.
- File-based images take precedence over `metadata.openGraph.images` in the same segment.
- `videos` only when the page is genuinely about a video.

## 6. X / Twitter cards

```tsx
twitter: {
  card: 'summary_large_image',
  site: '@company',
  creator: '@author',
  // title / description / images optional — X falls back to Open Graph
},
```
- `summary_large_image` = big image instead of thumbnail.
- X falls back to `og:title`, `og:description`, `og:image`, so usually only `card`, `site`, `creator` are needed.

## 7. Icons, manifest, Apple web app

Favicon shows next to your site name in Google mobile results, tabs, bookmarks. Missing/blurry = less trustworthy result.

**File convention (preferred)** — drop into `app/`:
| File | Notes |
|---|---|
| `favicon.ico` | root `app/` only; 32×32 (multi-size ok) |
| `icon.svg` or `icon.png` | modern browsers; PNG ≥ 192×192 or 512×512 |
| `apple-icon.png` | 180×180, no transparency (iOS fills it black) |

Equivalent object form:
```tsx
icons: {
  icon: [
    { url: '/favicon.ico', sizes: 'any' },
    { url: '/icon.svg', type: 'image/svg+xml' },
  ],
  apple: [{ url: '/apple-icon.png', sizes: '180x180' }],
},
manifest: '/manifest.webmanifest',
appleWebApp: {
  capable: true,
  title: 'Your App Name',
  statusBarStyle: 'black-translucent',
},
```

- `app/manifest.ts` → served at `/manifest.webmanifest` and linked automatically; don't also set `metadata.manifest` to a different path. Include `name`, `short_name`, `start_url`, `display: 'standalone'`, `background_color`, `theme_color`, 192 and 512 icons (plus a `maskable` one if available).
- Manifest + `appleWebApp` make the site installable (PWA). Not a ranking factor; good product feel.
- Legacy/optional: `mask-icon` (Safari pinned tabs), Apple `startupImage`, `msapplication-*`. Skip.
- Don't reference icon files that don't exist. If missing, tell the user which files/sizes to add.

## 8. Verification, format detection, app links, `other`

**Verification** — proves ownership so you can use Google Search Console (submit sitemap, see queries, indexing errors) and Bing Webmaster Tools (also feeds DuckDuckGo, Yahoo results, ChatGPT search, Copilot).
```tsx
verification: {
  google: 'google-site-verification-code',
  yandex: 'yandex-code',
  other: {
    'msvalidate.01': 'bing-code',
    'facebook-domain-verification': 'facebook-code',
  },
},
```
- Google code: Search Console → add property → "HTML tag" method; copy only the `content` value. A DNS TXT record is an equally valid alternative (and covers all subdomains).
- Ignore `yahoo` — that service no longer exists.
- Only include entries the user actually has; use a `TODO` comment otherwise. Never ship placeholder codes.

**Format detection** — stops iOS Safari auto-linking numbers/addresses (order IDs, prices mistaken for phone numbers):
```tsx
formatDetection: { email: false, address: false, telephone: false },
```

**App links** — only if a native app ships:
```tsx
appLinks: {
  ios: { url: 'https://example.com/ios', app_store_id: '123456789' },
  android: { package: 'com.example.app', app_name: 'Your App Name' },
},
```
For iOS Safari's Smart App Banner, `itunes: { appId: '123456789' }`.

**`other`** — arbitrary `<meta>` tags without a dedicated field. Skip `msapplication-TileColor` (Windows 8 tiles).

## 9. Structured data (JSON-LD)

Metadata tells search engines *about* a page; JSON-LD tells them *what it is* (Schema.org vocabulary). Enables rich results — ratings, prices, breadcrumbs, logo/knowledge panel — and helps AI search understand the product.

Not part of `metadata`; render a script tag in the page/layout (server component):
```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
/>
```
- The `.replace(/</g, '\\u003c')` prevents injected content (e.g. a post title containing `</script>`) from breaking out of the tag. Always include it. Use the `JsonLd` helper in `templates/nextjs/components/json-ld.tsx`.
- `@graph` holds several entities in one block; `@id` values (e.g. `https://example.com/#organization`) link them.
- Use absolute URLs inside JSON-LD (`metadataBase` doesn't apply here).

**Which types where**
| Page | Types |
|---|---|
| Home | `Organization` (name, url, logo, `sameAs` social profiles) + `WebSite` (name, url, publisher→org; `potentialAction` SearchAction only if site search exists) |
| SaaS / app landing | `SoftwareApplication` (or `WebApplication`): name, `applicationCategory`, `operatingSystem`, `offers`, publisher→org |
| Product page (physical goods) | `Product` with `offers` (price, priceCurrency, availability) |
| Blog post | `Article` / `BlogPosting`: headline, image, datePublished, dateModified, author (`Person` with url), publisher→org |
| Nested pages | `BreadcrumbList` |
| FAQ section | `FAQPage` (note: Google shows FAQ rich results only for authoritative gov/health sites now; still harmless and useful to AI tools) |

**Rules**
- Only mark up what's visible on the page. `aggregateRating`/`review` only if real and shown — fake review markup gets manual penalties.
- Ratings require `ratingValue` + `ratingCount` (or `reviewCount`).
- TypeScript: `npm i -D schema-dts`, type as `WithContext<SoftwareApplication>` or `Graph`.
- Validate with Rich Results Test and validator.schema.org.

## 10. Sitemap and robots.txt

Site-wide files. Sitemap lists every page you want indexed so new pages are found faster; robots.txt tells crawlers where not to go and where the sitemap is.

```ts
// app/sitemap.ts
import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts()
  return [
    { url: 'https://example.com', lastModified: new Date() },
    ...posts.map((p) => ({ url: `https://example.com/blog/${p.slug}`, lastModified: p.updatedAt })),
  ]
}
```

```ts
// app/robots.ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/dashboard/', '/api/'] },
    sitemap: 'https://example.com/sitemap.xml',
  }
}
```

- Served at `/sitemap.xml` and `/robots.txt`. Code-generated → new content appears automatically.
- URLs must be absolute, canonical, and indexable. Never include `noindex` pages, redirects, or private routes.
- Google ignores `priority` and `changeFrequency`; `lastModified` is used if accurate. Don't set `lastModified: new Date()` for every static page on every build unless content actually changed — use real dates where available.
- Multilingual: sitemap entries accept `alternates: { languages: { es: 'https://example.com/es/…' } }` (Next 14.2+).
- > 50,000 URLs: use `generateSitemaps()` to split.
- Don't keep a stale `public/sitemap.xml` or `public/robots.txt` alongside the generated ones — the static file conflicts.
- Optionally block non-production hosts: return `disallow: '/'` when not production.
- After deploying, submit `https://<domain>/sitemap.xml` in Search Console and Bing Webmaster Tools.

## 11. How metadata merges

- Metadata is evaluated root → leaf; child segments override parent fields.
- Merging is **shallow per top-level key**. If a page sets `openGraph: { title: 'X' }`, the parent's `openGraph.images`, `siteName`, etc. are **gone** for that page. Fix: export shared OG defaults from `lib/site.ts` and spread them: `openGraph: { ...sharedOpenGraph, title: 'X', url: '/x' }`. Same for `twitter`, `robots`, `alternates`.
- File-based metadata (`opengraph-image`, `icon`, etc.) has higher priority than the `metadata` object.
- `metadata` and `generateMetadata` are server-only — they can't be exported from a `'use client'` file. If a page is a client component, move metadata to a server `page.tsx` that renders the client component, or to a `layout.tsx`.
- `generateMetadata` fetches are memoized with the page's identical `fetch` calls; for DB/CMS calls wrap the loader in React `cache()` to avoid double queries.
- Missing dynamic content: call `notFound()` in `generateMetadata` too, so 404s don't get indexed with a generic title.

## 12. Fields to skip

| Field | Why |
|---|---|
| `keywords` | Ignored by Google since 2009 |
| `generator`, `category`, `classification` | No ranking effect |
| `verification.yahoo` | Service no longer exists |
| `other['msapplication-TileColor']`, `msapplication-*` | Windows 8 tiles |
| `icons.other` mask-icon | Legacy Safari pinned tabs |
| `appleWebApp.startupImage` | Optional legacy splash screens |
| `metadata.viewport` / `metadata.themeColor` / `metadata.colorScheme` | Deprecated — use `viewport` export |

## 13. Optional: llms.txt and llms-full.txt

**Optional, not part of the SEO baseline.** Add it only if the user asks for it or agrees when you offer it.

**What it is:** [`llms.txt`](https://llmstxt.org) is a Markdown file at the site root. It contains an H1 with the site name, a `>` blockquote summary, and H2 sections of links (`- [Title](url): note`). A section named `## Optional` marks links an LLM can skip when it's short on context. `llms-full.txt` is the same index followed by the full text of each page in one file.

**Why it's optional:** it's a community proposal, not a standard. Google and Bing don't use it for ranking or indexing, and the major AI crawlers don't reliably request it yet. It's most useful on docs sites, developer tools and APIs, where coding agents and AI assistants are pointed at the docs directly. For most marketing sites it does little.

**How (App Router):** templates in `templates/nextjs/`:
- `lib/llms.ts`: the link sections plus `buildLlmsTxt()` / `buildLlmsFullTxt()`, using `siteConfig` and `absoluteUrl()` from `lib/site.ts`.
- `app/llms.txt/route.ts` and `app/llms-full.txt/route.ts`: route handlers (a folder named `llms.txt` serves `/llms.txt`), `force-static` with hourly `revalidate`, `Content-Type: text/plain; charset=utf-8`.

**Pitfalls:**
- Public, indexable pages only, the same list as the sitemap. Never private, noindex or gated content, especially in `llms-full.txt`.
- Use Markdown or plain text from the CMS/MDX source, not rendered HTML.
- Absolute URLs that match the canonicals.
- Don't also keep a static `public/llms.txt`. It conflicts with the route.
- Don't present it as a ranking factor, and never report it missing as an error.
