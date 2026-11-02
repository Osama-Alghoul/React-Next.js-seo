// Dynamic route with per-post meta, JSON-LD and a real 404 status.
import type { Route } from './+types/blog.$slug'
import { seoMeta, absoluteUrl, site } from '../lib/seo'

type Post = { slug: string; title: string; excerpt: string; publishedAt: string; updatedAt: string; author: string }

async function getPost(slug: string): Promise<Post | null> {
  void slug
  return null // TODO: your data source
}

export async function loader({ params }: Route.LoaderArgs) {
  const post = await getPost(params.slug)
  if (!post) throw new Response('Not Found', { status: 404 }) // real 404, not a soft 404
  return { post }
}

export function meta({ data }: Route.MetaArgs) {
  if (!data) return seoMeta({ title: 'Post not found', path: '/blog', noindex: true })
  const { post } = data
  const path = `/blog/${post.slug}`
  const url = absoluteUrl(path)

  return [
    ...seoMeta({ title: post.title, description: post.excerpt, path, type: 'article' }),
    { property: 'article:published_time', content: post.publishedAt },
    { property: 'article:modified_time', content: post.updatedAt },
    {
      'script:ld+json': {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BlogPosting',
            headline: post.title,
            description: post.excerpt,
            url,
            mainEntityOfPage: url,
            image: absoluteUrl(site.ogImage),
            datePublished: post.publishedAt,
            dateModified: post.updatedAt,
            author: { '@type': 'Person', name: post.author },
            publisher: { '@id': absoluteUrl('/#organization') },
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: site.url },
              { '@type': 'ListItem', position: 2, name: 'Blog', item: absoluteUrl('/blog') },
              { '@type': 'ListItem', position: 3, name: post.title, item: url },
            ],
          },
        ],
      },
    },
  ]
}

export default function BlogPost({ loaderData }: Route.ComponentProps) {
  return (
    <article>
      <h1>{loaderData.post.title}</h1>
    </article>
  )
}
