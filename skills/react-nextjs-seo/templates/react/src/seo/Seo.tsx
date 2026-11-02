// React 19+: <title>, <meta> and <link> rendered anywhere are moved into <head> by React.
// React 18: use Seo.helmet.tsx instead (react-helmet-async).
// Render exactly ONE <Seo> per route.
import { absoluteUrl, buildSeo, type SeoProps } from './site'

export type { SeoProps }

export function Seo(props: SeoProps) {
  const { fullTitle, desc, url, img, alt, type } = buildSeo(props)
  const { noindex, languages, article } = props

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <link rel="canonical" href={url} />
      )}
      {!noindex &&
        languages &&
        Object.entries(languages).map(([lang, href]) => (
          <link key={lang} rel="alternate" hrefLang={lang} href={absoluteUrl(href)} />
        ))}

      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={alt} />
      {article?.publishedTime && <meta property="article:published_time" content={article.publishedTime} />}
      {article?.modifiedTime && <meta property="article:modified_time" content={article.modifiedTime} />}
      {article?.author && <meta property="article:author" content={article.author} />}
    </>
  )
}

export { removeSeoDefaults } from './site'
