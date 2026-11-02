// Example static page. The pageMetadata helper sets title, description, canonical,
// OG url and the shared OG defaults together, so none of them get forgotten.
import { pageMetadata } from '@/lib/site'

export const metadata = pageMetadata({
  title: 'Pricing', // renders "Pricing | Your App Name"
  description: 'Simple plans for teams of every size.',
  path: '/pricing',
  // Multilingual sites (hreflang):
  // languages: { 'en-US': '/en-US/pricing', 'es-ES': '/es-ES/pricing', 'x-default': '/pricing' },
})

export default function PricingPage() {
  return null
}
