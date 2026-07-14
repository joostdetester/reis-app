// Supabase Edge Function: delete-day-photo
//
// Verwijdert een geüploade dag-foto: valideert het edit-token (zelfde patroon als
// save-edit), verwijdert het bestand uit de Storage-bucket `day-photos` en de
// bijbehorende `day_photos`-rij — met de service-role key, dus buiten RLS om.
//
// Deploy: supabase functions deploy delete-day-photo

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

interface DeleteRequest {
  slug: string
  token: string
  photo_id: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Alleen POST toegestaan' }, 405)
  }

  let body: DeleteRequest
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Ongeldige JSON' }, 400)
  }

  const { slug, token, photo_id } = body
  if (!slug || !token || !photo_id) {
    return jsonResponse({ error: 'slug, token en photo_id zijn verplicht' }, 400)
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

  const { data: photo, error: photoError } = await supabaseAdmin
    .from('day_photos')
    .select('id, storage_path')
    .eq('id', photo_id)
    .eq('trip_id', trip.id)
    .maybeSingle()
  if (photoError || !photo) {
    return jsonResponse({ error: 'Foto niet gevonden voor deze reis' }, 404)
  }

  const { error: removeError } = await supabaseAdmin.storage.from('day-photos').remove([photo.storage_path])
  if (removeError) {
    return jsonResponse({ error: removeError.message }, 500)
  }

  const { error: deleteError } = await supabaseAdmin.from('day_photos').delete().eq('id', photo_id)
  if (deleteError) {
    return jsonResponse({ error: deleteError.message }, 500)
  }

  return jsonResponse({ data: { id: photo_id } })
})
