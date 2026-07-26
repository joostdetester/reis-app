// Supabase Edge Function: upload-day-photo
//
// Slaat een foto (base64) op voor een specifieke dag: valideert het edit-token (zelfde
// patroon als save-edit), zet het bestand in de publieke Storage-bucket `day-photos`,
// en registreert de rij in `day_photos` — allemaal met de service-role key, dus buiten
// RLS/storage-policies om (net als save-edit).
//
// Deploy: supabase functions deploy upload-day-photo
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY zijn al automatisch beschikbaar.

import { createClient } from 'npm:@supabase/supabase-js@2'

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

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

interface UploadRequest {
  slug: string
  token: string
  trip_day_id: string
  filename: string
  data: string // base64, zonder data-URL-prefix
  content_type: string
}

function extensionFor(contentType: string): string {
  if (contentType.includes('png')) return 'png'
  if (contentType.includes('webp')) return 'webp'
  if (contentType.includes('gif')) return 'gif'
  return 'jpg'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Alleen POST toegestaan' }, 405)
  }

  let body: UploadRequest
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Ongeldige JSON' }, 400)
  }

  const { slug, token, trip_day_id, filename, data, content_type } = body
  if (!slug || !token || !trip_day_id || !filename || !data || !content_type) {
    return jsonResponse({ error: 'slug, token, trip_day_id, filename, data en content_type zijn verplicht' }, 400)
  }

  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

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

  const { data: day, error: dayError } = await supabaseAdmin
    .from('trip_days')
    .select('id')
    .eq('id', trip_day_id)
    .eq('trip_id', trip.id)
    .maybeSingle()
  if (dayError || !day) {
    return jsonResponse({ error: 'Dag niet gevonden voor deze reis' }, 404)
  }

  let bytes: Uint8Array
  try {
    bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
  } catch {
    return jsonResponse({ error: 'Ongeldige foto-data' }, 400)
  }

  const ext = extensionFor(content_type)
  const path = `${trip.id}/${trip_day_id}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabaseAdmin.storage.from('day-photos').upload(path, bytes, {
    contentType: content_type,
    upsert: false,
  })
  if (uploadError) {
    return jsonResponse({ error: uploadError.message }, 500)
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('day_photos')
    .insert({ trip_id: trip.id, trip_day_id, storage_path: path })
    .select()
    .single()
  if (insertError) {
    return jsonResponse({ error: insertError.message }, 500)
  }

  const { data: publicUrlData } = supabaseAdmin.storage.from('day-photos').getPublicUrl(path)

  return jsonResponse({ data: { ...inserted, public_url: publicUrlData.publicUrl } })
})
