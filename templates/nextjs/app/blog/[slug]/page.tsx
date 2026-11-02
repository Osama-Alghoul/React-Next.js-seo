// Dynamic route: per-post metadata + BlogPosting and BreadcrumbList JSON-LD.
// Next 15+: params is a Promise. On Next 13/14 use `{ params }: { params: { slug: string } }` without await.
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { JsonLd } from '@/components/json-ld'
import { siteConfig, sharedOpenGraph, absoluteUrl } from '@/lib/site'

type Post = {
  slug: string
  title: string
  excerpt: string
  publishedAt: string
  updatedAt: string
  author: { name: string; url?: string }
  tags?: string[]
}

// TODO: replace with your data source. cache() dedupes the call between generateMetadata and the page.
const getPost = cache(async (slug: string): Promise<Post | null> => {
  void slug
  return null
})

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()

  const path = `/blog/${post.slug}`
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: path },
    openGraph: {
      ...sharedOpenGraph,
      type: 'article',
      title: post.title,
      description: post.excerpt,
      url: path,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author.name],
      tags: post.tags,
      // Image: ./opengraph-image.tsx generates one per post automatically.
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()

  const url = absoluteUrl(`/blog/${post.slug}`)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.excerpt,
        url,
        mainEntityOfPage: url,
        image: `${url}/opengraph-image`,
        datePublished: post.publishedAt,
        dateModified: post.updatedAt,
        author: { '@type': 'Person', name: post.author.name, url: post.author.url },
        publisher: { '@id': absoluteUrl('/#organization') },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: siteConfig.url },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: absoluteUrl('/blog') },
          { '@type': 'ListItem', position: 3, name: post.title, item: url },
        ],
      },
    ],
  }

  return (
    <article>
      <JsonLd data={jsonLd} />
      <h1>{post.title}</h1>
    </article>
  )
}
