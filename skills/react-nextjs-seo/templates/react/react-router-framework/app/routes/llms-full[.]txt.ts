// OPTIONAL resource route served at /llms-full.txt. See app/lib/llms.ts. Delete if you don't want it.
// If routes are listed in app/routes.ts: route('llms-full.txt', 'routes/llms-full[.]txt.ts')
import { buildLlmsFullTxt, llmsResponse } from '../lib/llms'

export async function loader() {
  return llmsResponse(await buildLlmsFullTxt())
}
