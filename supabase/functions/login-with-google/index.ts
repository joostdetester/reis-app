// Supabase Edge Function: login-with-google
//
// Verifieert een Google-toegangstoken server-side (userinfo-endpoint) en geeft bij een
// toegestaan, geverifieerd e-mailadres de echte edit-token terug. Zo kan een gezinslid
// inloggen met een van de vooraf afgesproken Google-accounts i.p.v. de geheime link te
// moeten bewaren — zie SECURITY.md voor de afweging.
//
// Deploy: supabase functions deploy login-with-google
// Secrets (Supabase dashboard > Edge Functions > login-with-google > Secrets):
//   TRIP_EDIT_TOKEN         de huidige geldige edit-token (plaintext, zelfde als in de geheime link)
//   ALLOWED_GOOGLE_EMAILS   kommagescheiden lijst toegestane e-mailadressen

interface GoogleUserInfo {
  email?: string
  email_verified?: boolean
  error?: string
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

  let body: { googleAccessToken?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Ongeldige JSON' }, 400)
  }

  const googleAccessToken = body.googleAccessToken
  if (!googleAccessToken) {
    return jsonResponse({ error: 'googleAccessToken is verplicht' }, 400)
  }

  const tripEditToken = Deno.env.get('TRIP_EDIT_TOKEN')
  const allowedEmails = (Deno.env.get('ALLOWED_GOOGLE_EMAILS') ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)

  if (!tripEditToken || allowedEmails.length === 0) {
    return jsonResponse({ error: 'Inloggen met Google is nog niet geconfigureerd' }, 501)
  }

  const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${googleAccessToken}` },
  })

  if (!userInfoResponse.ok) {
    return jsonResponse({ error: 'Google-token is ongeldig of verlopen' }, 401)
  }

  const userInfo: GoogleUserInfo = await userInfoResponse.json()
  const email = userInfo.email?.toLowerCase()

  if (!email || !userInfo.email_verified) {
    return jsonResponse({ error: 'Google-account heeft geen geverifieerd e-mailadres' }, 403)
  }

  if (!allowedEmails.includes(email)) {
    return jsonResponse({ error: 'Dit Google-account heeft geen toegang tot deze reis' }, 403)
  }

  return jsonResponse({ data: { token: tripEditToken } })
})
