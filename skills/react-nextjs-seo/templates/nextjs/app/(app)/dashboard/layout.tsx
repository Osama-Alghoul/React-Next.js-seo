// Private area: no-index everything under this segment (dashboard, settings, account, checkout...).
import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return children
}
