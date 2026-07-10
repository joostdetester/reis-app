// Eenmalig: voegt de echte Google-rating (sterren + aantal reviews) toe aan de
// duikcentra waarvoor die betrouwbaar te vinden was (via Wanderlog, dat Google
// Maps-ratings overneemt). Voor 2 centra was geen betrouwbare Google-rating te
// vinden — daar wordt bewust niets verzonnen, ze blijven zonder rating.
//
// Gebruik: node --env-file=supabase/.env.seed supabase/seed_dive_shop_ratings.mjs

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const TRIP_SLUG = process.env.TRIP_SLUG

// name moet exact overeenkomen met het "name"-veld in de bestaande dive_shops-rijen.
const RATINGS = {
  'Savedra Dive Center (Moalboal)': { rating: 4.8, rating_count: 945 },
  'Neptune Diving Resorts (Moalboal)': { rating: 4.7, rating_count: 396 },
  'Palaka Siargao Dive Center (General Luna)': { rating: 4.7, rating_count: 307 },
  'Palawan Divers (El Nido)': { rating: 4.9, rating_count: 710 },
  'Submariner Diving Center (El Nido)': { rating: 4.9, rating_count: 887 },
  // Geen betrouwbare Google-rating gevonden voor "Cebu Fun Divers (Moalboal)"
  // en "Let's Dive Palawan (Puerto Princesa)" — bewust niet ingevuld.
}

async function main() {
  const { data: trip, error: tripError } = await supabase.from('trips').select('id').eq('slug', TRIP_SLUG).single()
  if (tripError || !trip) {
    console.error('Trip niet gevonden voor slug', TRIP_SLUG, tripError)
    process.exit(1)
  }

  const { data: destinations, error: destError } = await supabase
    .from('destinations')
    .select('id, name, dive_shops')
    .eq('trip_id', trip.id)
    .not('dive_shops', 'is', null)

  if (destError) {
    console.error('Fout bij ophalen destinations:', destError)
    process.exit(1)
  }

  for (const dest of destinations) {
    let changed = false
    const updatedShops = dest.dive_shops.map((shop) => {
      const rating = RATINGS[shop.name]
      if (!rating) return shop
      changed = true
      return { ...shop, ...rating }
    })

    if (!changed) continue

    const { error } = await supabase.from('destinations').update({ dive_shops: updatedShops }).eq('id', dest.id)
    if (error) {
      console.error(`Fout bij updaten van "${dest.name}":`, error)
      process.exit(1)
    }
    console.log(`Bijgewerkt: ${dest.name}`)
  }
}

main()
