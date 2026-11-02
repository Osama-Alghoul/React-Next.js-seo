// Per-page Schema.org JSON-LD. Escapes `<` so content like "</script>" can't break out of the tag.
// Site-wide Organization/WebSite belong statically in index.html instead (visible without JS).
// Typing: npm i -D schema-dts, then pass WithContext<Article> etc.

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
