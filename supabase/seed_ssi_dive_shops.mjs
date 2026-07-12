// Eenmalig: markeert de bestaande duikcentra als PADI en voegt per bestemming één SSI-
// duikcentrum toe (de instructeur van de gebruiker gaf aan dat SSI-scholen ook goed zijn).
// Geen Google-rating verzonnen waar die niet betrouwbaar te vinden was (zelfde aanpak als
// eerder bij de PADI-centra) — alleen Pescador Diving Center had een geverifieerde rating.
//
// Gebruik: node --env-file=supabase/.env.seed supabase/seed_ssi_dive_shops.mjs

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const TRIP_SLUG = process.env.TRIP_SLUG

const NEW_SSI_SHOPS = {
  'Palawan - Puerto Princesa': {
    name: 'Divepuertoprincesa Dive Center (Puerto Princesa)',
    url: 'https://www.divepuertoprincesa.com/',
    distance_from_hotel: 'Barangay Bancao-Bancao, Puerto Princesa, enkele kilometers van Altremaru Jungle Retreat',
    price_indication: 'Prijs op aanvraag, zie website',
    certification: 'SSI',
  },
  'Palawan - El Nido': {
    name: 'Deep Blue Dive Seafari (El Nido)',
    url: 'https://deepbluediveseafari.com/',
    distance_from_hotel: 'In El Nido centrum, ca. 2-3 km van El Nido Moringa Resort (Corong Corong)',
    price_indication: '±₱1.335 per duik (3 duiken voor ₱4.000, incl. materiaal, gids en lunch)',
    certification: 'SSI',
  },
  'Cebu - Moalboal': {
    name: 'Pescador Diving Center (Moalboal)',
    url: 'https://pescadordivingcenter.com/',
    distance_from_hotel: 'Panagsama Beach, vlakbij Secret Paradise',
    price_indication: 'Prijs op aanvraag, zie website',
    certification: 'SSI',
    rating: 4.9,
    rating_count: 157,
  },
  Siargao: {
    name: 'Ocean Tribe Siargao (Cloud 9)',
    url: 'https://www.ocean-tribe.com/',
    distance_from_hotel: 'Cloud 9, Catangnan (Siargao), enkele kilometers van Terra Siargao',
    price_indication: 'Prijs op aanvraag, zie website',
    certification: 'SSI',
  },
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
    const markedPadi = dest.dive_shops.map((shop) => ({ certification: shop.certification ?? 'PADI', ...shop }))
    const newShop = NEW_SSI_SHOPS[dest.name]
    const updatedShops = newShop ? [...markedPadi, newShop] : markedPadi

    const { error } = await supabase.from('destinations').update({ dive_shops: updatedShops }).eq('id', dest.id)
    if (error) {
      console.error(`Fout bij updaten van "${dest.name}":`, error)
      process.exit(1)
    }
    console.log(`Bijgewerkt: ${dest.name}${newShop ? ` (+ ${newShop.name})` : ' (alleen PADI-labels)'}`)
  }
}

main()
