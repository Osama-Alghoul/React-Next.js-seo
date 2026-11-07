// OPTIONAL: builds /llms.txt and /llms-full.txt (https://llmstxt.org).
// llms.txt is a community proposal, not a standard. Search engines don't use it for ranking,
// and major AI crawlers don't reliably fetch it yet. Add it only if the user wants it, e.g. for
// docs sites or products that AI assistants and coding agents should be able to read easily.
// Skip it entirely without affecting any other part of the SEO setup.
import { siteConfig, absoluteUrl } from '@/lib/site'

type LlmsLink = { title: string; path: string; note?: string }
type LlmsSection = { heading: string; links: LlmsLink[] }

// Public, indexable pages only, the same rule as the sitemap. Never private or noindex routes.
// TODO: list the pages that best explain the product. An "Optional" section marks links an LLM may skip.
const sections: LlmsSection[] = [
  {
    heading: 'Product',
    links: [
      { title: 'Home', path: '/', note: 'What the product does and who it is for' },
      { title: 'Pricing', path: '/pricing', note: 'Plans and limits' },
    ],
  },
  { heading: 'Optional', links: [{ title: 'Blog', path: '/blog' }] },
]

// TODO: replace with your data source. Return the page content as Markdown (or plain text),
// not rendered HTML. Keep it to public content.
async function getAllPosts(): Promise<{ slug: string; title: string; excerpt: string; markdown: string }[]> {
  return []
}

const link = ({ title, path, note }: LlmsLink) => `- [${title}](${absoluteUrl(path)})${note ? `: ${note}` : ''}`

/** /llms.txt: a short Markdown index. H1 name, blockquote summary, then H2 sections of links. */
export async function buildLlmsTxt(): Promise<string> {
  const posts = await getAllPosts()
  const all = posts.length
    ? [
        ...sections.filter((s) => s.heading !== 'Optional'),
        { heading: 'Blog posts', links: posts.map((p) => ({ title: p.title, path: `/blog/${p.slug}`, note: p.excerpt })) },
        ...sections.filter((s) => s.heading === 'Optional'),
      ]
    : sections

  return [
    `# ${siteConfig.name}`,
    '',
    `> ${siteConfig.description}`,
    '',
    ...all.flatMap((s) => [`## ${s.heading}`, '', ...s.links.map(link), '']),
  ].join('\n')
}

/** /llms-full.txt: the same index followed by the full content of each page, in one file. */
export async function buildLlmsFullTxt(): Promise<string> {
  const posts = await getAllPosts()
  const body = posts.map((p) => [`## ${p.title}`, '', `Source: ${absoluteUrl(`/blog/${p.slug}`)}`, '', p.markdown.trim(), ''].join('\n'))
  return [await buildLlmsTxt(), '---', '', ...body].join('\n')
}

export const llmsHeaders = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'public, max-age=3600',
}
