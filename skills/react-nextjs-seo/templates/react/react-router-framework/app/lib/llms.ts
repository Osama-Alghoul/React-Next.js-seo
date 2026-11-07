// OPTIONAL: builds /llms.txt and /llms-full.txt (https://llmstxt.org).
// llms.txt is a community proposal, not a standard. Search engines don't use it for ranking,
// and major AI crawlers don't reliably fetch it yet. Add it only if the user wants it.
import { site, absoluteUrl } from './seo'

type LlmsLink = { title: string; path: string; note?: string }

// Public, indexable pages only, the same rule as the sitemap. TODO: your key pages.
const sections: { heading: string; links: LlmsLink[] }[] = [
  {
    heading: 'Product',
    links: [
      { title: 'Home', path: '/', note: 'What the product does and who it is for' },
      { title: 'Pricing', path: '/pricing', note: 'Plans and limits' },
    ],
  },
  { heading: 'Optional', links: [{ title: 'Blog', path: '/blog' }] }, // links an LLM may skip
]

// TODO: your data source. Return Markdown/plain text, not rendered HTML.
async function getAllPosts(): Promise<{ slug: string; title: string; excerpt: string; markdown: string }[]> {
  return []
}

const link = ({ title, path, note }: LlmsLink) => `- [${title}](${absoluteUrl(path)})${note ? `: ${note}` : ''}`

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
    `# ${site.name}`,
    '',
    `> ${site.description}`,
    '',
    ...all.flatMap((s) => [`## ${s.heading}`, '', ...s.links.map(link), '']),
  ].join('\n')
}

export async function buildLlmsFullTxt(): Promise<string> {
  const posts = await getAllPosts()
  const body = posts.map((p) => [`## ${p.title}`, '', `Source: ${absoluteUrl(`/blog/${p.slug}`)}`, '', p.markdown.trim(), ''].join('\n'))
  return [await buildLlmsTxt(), '---', '', ...body].join('\n')
}

export const llmsResponse = (body: string) =>
  new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } })
