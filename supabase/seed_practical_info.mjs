// Eenmalig: zet de praktische-informatie-content (voorheen hardcoded in app.js) als
// rijen in practical_info, zodat deze net als de rest bewerkbaar en realtime is.
//
// Gebruik: node --env-file=supabase/.env.seed supabase/seed_practical_info.mjs
// Idempotent: bestaande practical_info van deze trip wordt eerst verwijderd.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TRIP_SLUG = process.env.TRIP_SLUG

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !TRIP_SLUG) {
  console.error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY en TRIP_SLUG zijn verplicht (zie supabase/.env.seed).')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const ITEMS = [
  { section: 'nood', title: 'Nood', content: 'Algemeen alarmnummer Filipijnen: 911. Bewaar hier verzekerings- en polisgegevens.' },
  { section: 'geld', title: 'Geld', content: 'Valuta: Filipijnse peso (PHP). Neem voor kleinere plaatsen voldoende contant geld mee.' },
  { section: 'vervoer', title: 'Vervoer', content: 'Gebruik Google Maps en waar beschikbaar Grab. Controleer transfers een dag vooraf.' },
  { section: 'bereikbaarheid', title: 'Bereikbaarheid', content: 'Internet kan per eiland wisselen. Bewaar belangrijke boekingsnummers ook als screenshot.' },
]

async function main() {
  const { data: trip, error: tripError } = await supabase.from('trips').select('id').eq('slug', TRIP_SLUG).single()
  if (tripError || !trip) {
    console.error('Trip niet gevonden voor slug', TRIP_SLUG, tripError)
    process.exit(1)
  }

  await supabase.from('practical_info').delete().eq('trip_id', trip.id)

  const rows = ITEMS.map((item, index) => ({ trip_id: trip.id, sort_order: index, ...item }))
  const { error } = await supabase.from('practical_info').insert(rows)
  if (error) {
    console.error('Fout bij invoegen practical_info:', error)
    process.exit(1)
  }
  console.log(`${rows.length} practical_info-rijen aangemaakt.`)
}

main()
