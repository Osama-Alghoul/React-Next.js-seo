// OPTIONAL: served at /llms.txt. See lib/llms.ts. Delete this folder if you don't want it.
import { buildLlmsTxt, llmsHeaders } from '@/lib/llms'

export const dynamic = 'force-static'
export const revalidate = 3600 // regenerate hourly so new posts show up

export async function GET() {
  return new Response(await buildLlmsTxt(), { headers: llmsHeaders })
}
