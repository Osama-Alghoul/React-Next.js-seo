// OPTIONAL resource route served at /llms.txt. See app/lib/llms.ts. Delete if you don't want it.
// If routes are listed in app/routes.ts: route('llms.txt', 'routes/llms[.]txt.ts')
import { buildLlmsTxt, llmsResponse } from '../lib/llms'

export async function loader() {
  return llmsResponse(await buildLlmsTxt())
}
