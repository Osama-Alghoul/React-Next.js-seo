// Usage examples for a Vite/CRA app with React Router (library mode). Adapt into the real files.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Outlet, useParams } from 'react-router' // v7; v6: 'react-router-dom'
import { Seo, removeSeoDefaults } from './seo/Seo'
import { JsonLd } from './seo/JsonLd'
import { absoluteUrl, site } from './seo/site'

// ---- main.tsx --------------------------------------------------------------
removeSeoDefaults() // before the first render

const router = createBrowserRouter([ // NEVER createHashRouter: Google ignores everything after '#'
  { path: '/', element: <Home /> },
  { path: '/pricing', element: <Pricing /> },
  { path: '/blog/:slug', element: <BlogPost /> },
  { path: '/dashboard', element: <PrivateLayout />, children: [/* … */] },
  { path: '*', element: <NotFound /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* React 18 + Helmet: wrap in <HelmetProvider> */}
    <RouterProvider router={router} />
  </StrictMode>,
)

// ---- routes ----------------------------------------------------------------
function Home() {
  return (
    <>
      <Seo path="/" />
      {/* page content */}
    </>
  )
}

function Pricing() {
  return (
    <>
      <Seo title="Pricing" description="Simple plans for teams of every size." path="/pricing" />
      {/* page content */}
    </>
  )
}

function BlogPost() {
  const { slug = '' } = useParams()
  const post = usePost(slug) // TODO: your data hook
  if (!post) return <NotFound />

  const url = absoluteUrl(`/blog/${slug}`)
  return (
    <article>
      <Seo
        title={post.title}
        description={post.excerpt}
        path={`/blog/${slug}`}
        image={post.ogImage}
        type="article"
        article={{ publishedTime: post.publishedAt, modifiedTime: post.updatedAt, author: post.author }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.excerpt,
          url,
          mainEntityOfPage: url,
          image: absoluteUrl(post.ogImage ?? site.ogImage),
          datePublished: post.publishedAt,
          dateModified: post.updatedAt,
          author: { '@type': 'Person', name: post.author },
          publisher: { '@id': absoluteUrl('/#organization') },
        }}
      />
      <h1>{post.title}</h1>
    </article>
  )
}

// Private area: noindex once in the layout route. Its children still render their own titles.
function PrivateLayout() {
  return (
    <>
      <Seo title="Dashboard" path="/dashboard" noindex />
      <Outlet />
    </>
  )
}

// SPA hosts return HTTP 200 for unknown URLs. At least mark the page noindex.
function NotFound() {
  return (
    <>
      <Seo title="Page not found" path="/404" noindex />
      <h1>Page not found</h1>
    </>
  )
}

// stub so the example type-checks
function usePost(_slug: string):
  | { title: string; excerpt: string; ogImage?: string; publishedAt: string; updatedAt: string; author: string }
  | null {
  return null
}
