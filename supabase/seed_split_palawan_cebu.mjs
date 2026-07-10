// Eenmalig: splitst de destinations-rijen "Palawan" en "Cebu" op in hun twee
// bezochte plekken (Palawan - Puerto Princesa / Palawan - El Nido,
// Cebu - Cebu City / Cebu - Moalboal), met de bijbehorende duikcentra en foto's.
//
// Gebruik: node --env-file=supabase/.env.seed supabase/seed_split_palawan_cebu.mjs

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const TRIP_SLUG = process.env.TRIP_SLUG

async function main() {
  const { data: trip, error: tripError } = await supabase.from('trips').select('id').eq('slug', TRIP_SLUG).single()
  if (tripError || !trip) {
    console.error('Trip niet gevonden voor slug', TRIP_SLUG, tripError)
    process.exit(1)
  }

  const { data: existing, error: existingError } = await supabase
    .from('destinations')
    .select('id, name, dive_shops')
    .eq('trip_id', trip.id)
    .in('name', ['Palawan', 'Cebu'])

  if (existingError) {
    console.error('Fout bij ophalen bestaande rijen:', existingError)
    process.exit(1)
  }

  const palawan = existing.find((d) => d.name === 'Palawan')
  const cebu = existing.find((d) => d.name === 'Cebu')

  if (palawan) {
    const elNidoShops = palawan.dive_shops.filter((s) => s.name.includes('El Nido'))
    const { error } = await supabase
      .from('destinations')
      .update({ name: 'Palawan - El Nido', dive_shops: elNidoShops })
      .eq('id', palawan.id)
    if (error) {
      console.error('Fout bij hernoemen Palawan -> Palawan - El Nido:', error)
      process.exit(1)
    }
    console.log('Hernoemd: Palawan -> Palawan - El Nido (dive_shops beperkt tot El Nido)')

    const ppShops = palawan.dive_shops.filter((s) => s.name.includes('Puerto Princesa'))
    const { error: insertError } = await supabase.from('destinations').insert({
      trip_id: trip.id,
      name: 'Palawan - Puerto Princesa',
      photo_url: '/images/destination-puerto-princesa.jpg',
      dive_shops: ppShops,
    })
    if (insertError) {
      console.error('Fout bij aanmaken Palawan - Puerto Princesa:', insertError)
      process.exit(1)
    }
    console.log('Aangemaakt: Palawan - Puerto Princesa')
  }

  if (cebu) {
    const { error } = await supabase.from('destinations').update({ name: 'Cebu - Moalboal' }).eq('id', cebu.id)
    if (error) {
      console.error('Fout bij hernoemen Cebu -> Cebu - Moalboal:', error)
      process.exit(1)
    }
    console.log('Hernoemd: Cebu -> Cebu - Moalboal')

    const { error: insertError } = await supabase.from('destinations').insert({
      trip_id: trip.id,
      name: 'Cebu - Cebu City',
      photo_url: '/images/destination-cebu-city.jpg',
      dive_shops: null,
    })
    if (insertError) {
      console.error('Fout bij aanmaken Cebu - Cebu City:', insertError)
      process.exit(1)
    }
    console.log('Aangemaakt: Cebu - Cebu City')
  }
}

main()
