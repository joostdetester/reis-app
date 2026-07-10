// Eenmalig: zet top-duikbedrijven per eiland in destinations.dive_shops.
// Bron: web search op de exacte bedrijfsnaam (zie chatgeschiedenis). Prijzen die niet
// betrouwbaar te bevestigen waren, staan als "Prijs op aanvraag" i.p.v. verzonnen getallen.
// Siargao heeft maar 1 PADI-duikcentrum gevonden — bewust geen top 3 aangevuld met gokwerk.
//
// Gebruik: node --env-file=supabase/.env.seed supabase/seed_dive_shops.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TRIP_SLUG = process.env.TRIP_SLUG

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !TRIP_SLUG) {
  console.error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY en TRIP_SLUG zijn verplicht (zie supabase/.env.seed).')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const DESTINATIONS = [
  {
    name: 'Palawan',
    dive_shops: [
      {
        name: 'Palawan Divers (El Nido)',
        url: 'https://www.palawan-divers.org/',
        distance_from_hotel: 'In El Nido centrum, ca. 2-3 km van El Nido Moringa Resort (Corong Corong)',
        price_indication: '±₱2.150 per duik (₱4.300 voor 2 duiken, incl. materiaal, gids en lunch)',
      },
      {
        name: 'Submariner Diving Center (El Nido)',
        url: 'https://www.submarinerdiving.com/',
        distance_from_hotel: 'In El Nido centrum, ca. 2-3 km van El Nido Moringa Resort (Corong Corong)',
        price_indication: 'Prijs op aanvraag, zie website',
      },
      {
        name: "Let's Dive Palawan (Puerto Princesa)",
        url: 'https://letsdivepalawan.com/',
        distance_from_hotel: 'Rizal Avenue, centrum Puerto Princesa, enkele kilometers van Altremaru Jungle Retreat',
        price_indication: '±₱2.200-2.300 per duik (2 of 3 duiken per uitje, incl. materiaal en lucht)',
      },
    ],
  },
  {
    name: 'Cebu',
    dive_shops: [
      {
        name: 'Savedra Dive Center (Moalboal)',
        url: 'https://www.savedra.com/',
        distance_from_hotel: 'Panagsama Beach, vlakbij Secret Paradise',
        price_indication: 'Vanaf ₱1.400 per duik (excl. marine park fee van ₱100)',
      },
      {
        name: 'Cebu Fun Divers (Moalboal)',
        url: 'https://cebufundivers.com/',
        distance_from_hotel: 'Panagsama Beach / Moalboal Bay, vlakbij Secret Paradise',
        price_indication: 'Prijs op aanvraag, zie website',
      },
      {
        name: 'Neptune Diving Resorts (Moalboal)',
        url: 'https://www.neptunediving.com/',
        distance_from_hotel: 'Moalboal, vlakbij Secret Paradise',
        price_indication: 'Prijs op aanvraag, zie website',
      },
    ],
  },
  {
    name: 'Siargao',
    dive_shops: [
      {
        name: 'Palaka Siargao Dive Center (General Luna)',
        url: 'http://www.palakaresort.com',
        distance_from_hotel: 'General Luna, vlakbij Terra Siargao',
        price_indication: '±₱2.000 per duik (minimum 2 duiken)',
      },
    ],
  },
]

async function main() {
  const { data: trip, error: tripError } = await supabase.from('trips').select('id').eq('slug', TRIP_SLUG).single()
  if (tripError || !trip) {
    console.error('Trip niet gevonden voor slug', TRIP_SLUG, tripError)
    process.exit(1)
  }

  for (const dest of DESTINATIONS) {
    const { data: existing } = await supabase
      .from('destinations')
      .select('id')
      .eq('trip_id', trip.id)
      .eq('name', dest.name)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase.from('destinations').update({ dive_shops: dest.dive_shops }).eq('id', existing.id)
      if (error) {
        console.error('Fout bij updaten', dest.name, error)
        process.exit(1)
      }
      console.log('Bijgewerkt:', dest.name)
    } else {
      const { error } = await supabase.from('destinations').insert({
        trip_id: trip.id,
        name: dest.name,
        dive_shops: dest.dive_shops,
      })
      if (error) {
        console.error('Fout bij invoegen', dest.name, error)
        process.exit(1)
      }
      console.log('Aangemaakt:', dest.name)
    }
  }
}

main()
