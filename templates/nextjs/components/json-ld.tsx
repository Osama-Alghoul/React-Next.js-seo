// Renders Schema.org JSON-LD safely. Use in server components (pages/layouts).
// `<` is escaped as < so content like "</script>" can't break out of the tag.
// For typing: `npm i -D schema-dts` and pass e.g. WithContext<SoftwareApplication> or Graph.

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
