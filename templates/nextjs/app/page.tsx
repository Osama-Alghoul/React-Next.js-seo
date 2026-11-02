// Home page: self canonical + Organization / WebSite / SoftwareApplication JSON-LD.
import type { Metadata } from 'next'
import { JsonLd } from '@/components/json-ld'
import { siteConfig, absoluteUrl } from '@/lib/site'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

const orgId = absoluteUrl('/#organization')

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': orgId,
      name: siteConfig.organization.legalName,
      url: siteConfig.url,
      logo: absoluteUrl(siteConfig.organization.logo),
      sameAs: siteConfig.organization.sameAs,
    },
    {
      '@type': 'WebSite',
      '@id': absoluteUrl('/#website'),
      name: siteConfig.name,
      url: siteConfig.url,
      publisher: { '@id': orgId },
    },
    {
      '@type': 'SoftwareApplication',
      name: siteConfig.name,
      applicationCategory: 'BusinessApplication', // TODO: pick the right category
      operatingSystem: 'Web',
      url: siteConfig.url,
      publisher: { '@id': orgId },
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, // TODO: real pricing
      // Only add if ratings are REAL and VISIBLE on this page:
      // aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', ratingCount: '120' },
    },
  ],
}

export default function HomePage() {
  return (
    <>
      <JsonLd data={jsonLd} />
      {/* page content */}
    </>
  )
}
