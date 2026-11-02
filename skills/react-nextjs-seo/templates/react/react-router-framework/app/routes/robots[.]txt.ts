// Resource route served at /robots.txt. Delete any public/robots.txt so they don't conflict.
import { site } from '../lib/seo'

export function loader() {
  const isProd = process.env.DEPLOY_ENV ? process.env.DEPLOY_ENV === 'production' : process.env.NODE_ENV === 'production'
  const body = isProd
    ? [
        'User-agent: *',
        'Allow: /',
        'Disallow: /api/',
        'Disallow: /dashboard/', // TODO: your private areas
        '',
        `Sitemap: ${site.url}/sitemap.xml`,
      ].join('\n')
    : 'User-agent: *\nDisallow: /'

  return new Response(body + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
