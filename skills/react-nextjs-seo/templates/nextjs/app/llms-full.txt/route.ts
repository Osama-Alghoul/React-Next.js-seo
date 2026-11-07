// OPTIONAL: served at /llms-full.txt. See lib/llms.ts. Delete this folder if you don't want it.
import { buildLlmsFullTxt, llmsHeaders } from '@/lib/llms'

export const dynamic = 'force-static'
export const revalidate = 3600

export async function GET() {
  return new Response(await buildLlmsFullTxt(), { headers: llmsHeaders })
}
