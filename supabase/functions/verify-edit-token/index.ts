// Supabase Edge Function: verify-edit-token
//
// Read-only check of een token daadwerkelijk bij de trip hoort — wijzigt niets. Bestaat zodat
// de frontend Bewerk-knoppen pas toont nadat de token echt geverifieerd is, in plaats van bij
// elke aanwezige (ook onjuiste) token-waarde: zonder deze check zou iemand met een verzonnen
// token wel Bewerk-knoppen zien, en pas bij een opslagpoging een 401 van save-edit terugkrijgen.
// De eigenlijke afdwinging blijft bij save-edit (zie SECURITY.md) — dit voorkomt alleen de
// misleidende UI, het is geen nieuwe autorisatiegrens.
//
// Deploy: supabase functions deploy verify-edit-token
// Env (Supabase dashboard > Edge Functions > verify-edit-token > Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (door Supabase automatisch beschikbaar)

import { createClient } from 'npm:@supabase/supabase-js@2'

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS_HEADERS },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Alleen POST toegestaan' }, 405)
  }

  let body: { slug?: string; token?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Ongeldige JSON' }, 400)
  }

  const { slug, token } = body
  if (!slug || !token) {
    return jsonResponse({ error: 'slug en token zijn verplicht' }, 400)
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: trip } = await supabaseAdmin
    .from('trips')
    .select('access_token_hash')
    .eq('slug', slug)
    .maybeSingle()

  // Onbekende slug of foute token leveren allebei gewoon "valid: false" op — dit endpoint
  // meldt alleen een uitkomst, geen foutstatus, zodat de frontend het als een simpel
  // ja/nee-antwoord kan behandelen.
  const valid = trip != null && (await sha256Hex(token)) === trip.access_token_hash

  return jsonResponse({ data: { valid } })
})
