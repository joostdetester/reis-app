// Supabase Edge Function: save-edit
//
// Enige schrijfpad voor de app. Valideert de edit-token tegen trips.access_token_hash
// en voert daarna, met de service-role key (leeft alleen hier, nooit in de frontend),
// een UPDATE uit op een bestaand record. Geen insert/delete van nieuwe hoofdonderdelen,
// conform CLAUDE.md ("Geen nieuwe losse hoofdonderdelen toevoegen via algemene CRUD").
//
// Deploy: supabase functions deploy save-edit
// Env (Supabase dashboard > Edge Functions > save-edit > Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (door Supabase automatisch beschikbaar)

import { createClient } from 'npm:@supabase/supabase-js@2'

// Tabel -> kolommen die via deze functie bewerkt mogen worden.
// id, trip_id en gerelateerde sleutels staan hier bewust niet in.
const EDITABLE_COLUMNS: Record<string, string[]> = {
  trip_days: ['location', 'island', 'day_type', 'morning_text', 'afternoon_text', 'evening_text', 'notes'],
  accommodations: ['name', 'address', 'check_in', 'check_out', 'booking_reference', 'phone', 'maps_url', 'photo_url'],
  transport_items: [
    'type',
    'carrier',
    'booking_reference',
    'origin',
    'destination',
    'departure_time',
    'arrival_time',
    'departure_terminal',
    'departure_gate',
    'arrival_terminal',
    'delay_minutes',
    'maps_url',
    'status',
  ],
  activities: ['title', 'day_part', 'exact_time', 'status', 'category', 'address', 'maps_url'],
  destinations: ['name', 'summary', 'restaurants', 'practical_tips', 'bad_weather_alternatives', 'dive_shops', 'photo_url'],
  practical_info: ['section', 'title', 'content', 'sort_order'],
}

interface SaveEditRequest {
  slug: string
  token: string
  table: keyof typeof EDITABLE_COLUMNS
  id: string
  patch: Record<string, unknown>
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// De app draait achter een geheime link zonder vast domein (lokaal, GitHub Pages, ...),
// dus geen vaste origin om tegen te whitelisten — zie SECURITY.md voor de bredere afweging.
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

  let body: SaveEditRequest
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Ongeldige JSON' }, 400)
  }

  const { slug, token, table, id, patch } = body

  if (!slug || !token || !table || !id || !patch || typeof patch !== 'object') {
    return jsonResponse({ error: 'slug, token, table, id en patch zijn verplicht' }, 400)
  }

  const allowedColumns = EDITABLE_COLUMNS[table]
  if (!allowedColumns) {
    return jsonResponse({ error: `Tabel '${table}' is niet bewerkbaar via deze functie` }, 400)
  }

  const patchKeys = Object.keys(patch)
  const disallowedKeys = patchKeys.filter((key) => !allowedColumns.includes(key))
  if (disallowedKeys.length > 0) {
    return jsonResponse({ error: `Niet-toegestane velden: ${disallowedKeys.join(', ')}` }, 400)
  }
  if (patchKeys.length === 0) {
    return jsonResponse({ error: 'patch mag niet leeg zijn' }, 400)
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: trip, error: tripError } = await supabaseAdmin
    .from('trips')
    .select('id, access_token_hash')
    .eq('slug', slug)
    .maybeSingle()

  if (tripError || !trip) {
    return jsonResponse({ error: 'Reis niet gevonden' }, 404)
  }

  const tokenHash = await sha256Hex(token)
  if (tokenHash !== trip.access_token_hash) {
    return jsonResponse({ error: 'Ongeldige edit-token' }, 401)
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from(table)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('trip_id', trip.id)
    .select()
    .maybeSingle()

  if (updateError) {
    return jsonResponse({ error: updateError.message }, 500)
  }
  if (!updated) {
    return jsonResponse({ error: 'Record niet gevonden voor deze reis' }, 404)
  }

  return jsonResponse({ data: updated })
})
