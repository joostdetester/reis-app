// Eenmalig: zet photo_url op de destinations (Palawan/Cebu/Siargao). Foto's zijn
// gedownload van Wikimedia Commons (CC BY-SA, zie credits hieronder) en staan als
// statisch bestand in public/images/. Credit wordt getoond in de UI zelf (Bestemmingen-
// pagina) i.p.v. hier, zodat de bron ook voor gebruikers zichtbaar is.
//
// Gebruik: node --env-file=supabase/.env.seed supabase/seed_destination_photos.mjs

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const TRIP_SLUG = process.env.TRIP_SLUG

const PHOTOS = {
  Palawan: '/images/destination-palawan.jpg', // Big Lagoon, El Nido — Marciano Villavito, CC BY-SA 4.0
  Cebu: '/images/destination-cebu.jpg', // White Beach, Moalboal — Lindstrm, CC BY-SA 3.0
  Siargao: '/images/destination-siargao.jpg', // Cloud 9, General Luna — Alsitjar, CC BY-SA 4.0
}

async function main() {
  const { data: trip, error: tripError } = await supabase.from('trips').select('id').eq('slug', TRIP_SLUG).single()
  if (tripError || !trip) {
    console.error('Trip niet gevonden voor slug', TRIP_SLUG, tripError)
    process.exit(1)
  }

  for (const [name, photo_url] of Object.entries(PHOTOS)) {
    const { data, error } = await supabase
      .from('destinations')
      .update({ photo_url })
      .eq('trip_id', trip.id)
      .eq('name', name)
      .select('name')
      .maybeSingle()

    if (error) {
      console.error('Fout bij', name, error)
      process.exit(1)
    }
    if (!data) {
      console.warn('Geen destinations-rij gevonden voor', name)
      continue
    }
    console.log('Bijgewerkt:', data.name)
  }
}

main()
