// Eenmalig: zet photo_url op de destinations. Foto's zijn gedownload van Wikimedia
// Commons (CC BY(-SA), zie credits hieronder + in de UI zelf op de Bestemmingen-pagina)
// en staan als statisch bestand in public/images/.
//
// Gebruik: node --env-file=supabase/.env.seed supabase/seed_destination_photos.mjs

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const TRIP_SLUG = process.env.TRIP_SLUG

const PHOTOS = {
  Amsterdam: '/images/destination-amsterdam.jpg', // Brug 69, Prinsengracht — Sarah Stierch, CC BY 4.0
  Luzon: '/images/destination-luzon.jpg', // Fort Santiago, Intramuros, Manila — Markadan, CC BY 4.0
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
    const { data: existing } = await supabase
      .from('destinations')
      .select('id')
      .eq('trip_id', trip.id)
      .eq('name', name)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase.from('destinations').update({ photo_url }).eq('id', existing.id)
      if (error) {
        console.error('Fout bij updaten', name, error)
        process.exit(1)
      }
      console.log('Bijgewerkt:', name)
    } else {
      const { error } = await supabase.from('destinations').insert({ trip_id: trip.id, name, photo_url })
      if (error) {
        console.error('Fout bij invoegen', name, error)
        process.exit(1)
      }
      console.log('Aangemaakt:', name)
    }
  }
}

main()
