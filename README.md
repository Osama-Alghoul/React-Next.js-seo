# react-nextjs-seo

An [Agent Skill](https://docs.claude.com/en/docs/claude-code/skills) that teaches Claude to **set up, fix, or audit complete SEO for React apps**:

- **Next.js App Router** (Metadata API, `opengraph-image`, `sitemap.ts`, `robots.ts`, `manifest.ts`)
- **React SPAs** built with Vite or Create React App (React 19 native metadata or `react-helmet-async`)
- **React Router v7 framework mode / Remix** (`meta` exports, resource routes, prerendering)

It covers viewport and theme color, titles and descriptions, per-page canonical and hreflang, robots meta, Open Graph and X/Twitter cards, favicons/manifest/Apple web app tags, search-engine verification, JSON-LD structured data, sitemap and robots.txt, plus *optional* `llms.txt` / `llms-full.txt` for AI assistants. It also handles SPA-specific problems: crawlers that don't run JavaScript, prerendering, duplicate head tags, soft 404s and hash routing.

## Repository layout

```
skills/
└── react-nextjs-seo/          ← the skill (copy this folder)
    ├── SKILL.md               ← instructions Claude follows
    ├── references/
    │   ├── nextjs-reference.md   rules, reasons and edge cases for Next.js
    │   └── react-reference.md    rules for SPAs and React Router framework mode
    ├── scripts/
    │   └── audit.mjs          ← zero-dependency, read-only SEO audit
    └── templates/
        ├── nextjs/            ← drop-in App Router files
        └── react/             ← index.html, <Seo>/<JsonLd> components,
                                  sitemap generator, React Router templates
```

## Installation

The skill is the `skills/react-nextjs-seo/` folder. Copy it into a skills directory that Claude Code reads.

**Personal (all your projects):**

```bash
# macOS / Linux
git clone https://github.com/<you>/react-nextjs-seo.git
cp -r react-nextjs-seo/skills/react-nextjs-seo ~/.claude/skills/

# Windows (PowerShell)
Copy-Item -Recurse react-nextjs-seo\skills\react-nextjs-seo "$env:USERPROFILE\.claude\skills\"
```

**Project-only (shared with your team via git):**

```bash
mkdir -p .claude/skills
cp -r path/to/react-nextjs-seo/skills/react-nextjs-seo .claude/skills/
```

**Claude.ai / Claude Desktop:** zip the `react-nextjs-seo` folder (so `SKILL.md` sits at the top of the zip's folder) and upload it under *Settings → Capabilities → Skills*.

Restart Claude Code (or start a new session) and check that it's loaded by asking *"What skills do you have?"*

## Usage

You don't need to call the skill by name. Claude picks it up when your request is about SEO in a React or Next.js project. Open your project and ask things like:

| You say | What happens |
|---|---|
| "Add SEO to this Next.js app" | Full setup: metadata, OG images, JSON-LD, sitemap, robots, manifest |
| "Audit the SEO of this project" | Runs the audit script and explains every finding |
| "Link previews on LinkedIn/Slack show the wrong title" | Diagnoses OG/X tags and, for SPAs, the rendering strategy |
| "Add a sitemap and robots.txt" | Generates them for your framework, gated on production |
| "Add structured data so we get rich results" | Organization / WebSite / Article / Product / Breadcrumb JSON-LD |
| "Get this site ready for launch and Search Console" | Full setup plus the launch checklist |
| "My Vite app shows 'Vite + React' in Google" | Fixes `index.html` defaults and adds per-route head management |
| "Add llms.txt" | *Optional extra:* generates `/llms.txt` and `/llms-full.txt` from your public pages |

`llms.txt` is a community proposal, not a standard, and isn't a ranking factor. The skill offers it as an optional extra, never adds it by default, and the audit never reports it missing as an error or warning.

### What Claude will do

1. **Inspect** – detects the framework and versions, runs the audit, maps routes into public / private / dynamic.
2. **Gather facts** – reads the production URL, brand name, description, colors, locales, social handles, etc. from your code first, then asks you **once** for anything missing. It never invents verification codes, handles or ratings; it leaves `TODO` markers instead.
3. **Implement** – applies the framework-specific track, adapting the bundled templates to your code.
4. **Verify** – re-runs the audit, type-checks/builds, checks the HTML crawlers actually receive, and gives you a report with remaining `TODO`s and a launch checklist.

For plain React SPAs, Claude will explain the rendering trade-off (stay SPA vs. prerender vs. SSR) and ask you to choose before changing anything, because social and AI crawlers don't run JavaScript.

## Running the audit on its own

The audit script works without Claude. It needs Node.js 18+ and no dependencies, and it never modifies files.

```bash
node skills/react-nextjs-seo/scripts/audit.mjs /path/to/your/project
```

It auto-detects Next.js App Router, Vite / CRA SPAs and React Router framework mode, and prints errors (actively hurting SEO), warnings and passed checks. It exits with code `1` if any error is found, so you can use it in CI:

```yaml
# .github/workflows/seo.yml
- run: node path/to/audit.mjs .
```

## Using the templates manually

The files under `templates/` are working examples you can copy by hand:

- **Next.js:** start with `templates/nextjs/lib/site.ts` (central config + `pageMetadata()` helper) and `app/layout.tsx`, then add `sitemap.ts`, `robots.ts`, `manifest.ts`, `opengraph-image.tsx` and `components/json-ld.tsx`. Optional: `lib/llms.ts` with `app/llms.txt/route.ts` and `app/llms-full.txt/route.ts`.
- **Vite / CRA:** replace your `index.html` head with `templates/react/index.html`, copy `src/seo/` and render one `<Seo>` per route (see `src/examples.tsx`). Add `scripts/generate-sitemap.mjs` as a `postbuild` step. Optional: `scripts/generate-llms.mjs`.
- **React Router v7:** use `app/lib/seo.ts` (`seoMeta()` helper), `root.tsx`, and the `sitemap[.]xml.ts` / `robots[.]txt.ts` resource routes. Optional: `app/lib/llms.ts` with the `llms[.]txt.ts` / `llms-full[.]txt.ts` routes.

Replace `example.com`, brand names and every `TODO` with your real values.

## After deploying

- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Schema Markup Validator](https://validator.schema.org/)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/) and [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- Lighthouse (Chrome DevTools → Lighthouse → SEO)
- [Google Search Console](https://search.google.com/search-console): submit `https://<your-domain>/sitemap.xml`

## Limitations

- Targets the Next.js **App Router**. For the Pages Router, Claude will explain the equivalent approach or offer a migration.
- A pure client-side SPA can't give each route its own social preview without prerendering or SSR. The skill tells you this rather than hiding it.
