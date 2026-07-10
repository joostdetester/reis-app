// Eenmalig: vult departure_time/arrival_time in voor de drie binnenlandse
// tussen-eiland-vluchten. Tijden komen uit de bestaande middag-tekst van die dagen
// (oorspronkelijk data.json), nu ook gestructureerd op transport_items gezet.
// Alle binnenlandse vluchten liggen in Asia/Manila (+08:00, geen zomertijd).
//
// Gebruik: node --env-file=supabase/.env.seed supabase/seed_domestic_flight_times.mjs

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const UPDATES = [
  {
    booking_reference: 'DG6255', // El Nido -> Cebu, 1 aug
    origin: 'El Nido (Palawan)',
    destination: 'Cebu City (Cebu)',
    departure_time: '2026-08-01T16:40:00+08:00',
    arrival_time: '2026-08-01T18:25:00+08:00',
  },
  {
    booking_reference: 'PR2382', // Moalboal -> Siargao, 7 aug
    origin: 'Cebu (Mactan-Cebu)',
    destination: 'Siargao',
    departure_time: '2026-08-07T15:00:00+08:00',
    arrival_time: '2026-08-07T15:50:00+08:00',
  },
  {
    booking_reference: 'PR2352 / PR2868', // Siargao -> Manila (via Cebu), 11 aug, eerste been
    origin: 'Siargao',
    destination: 'Manila (via Cebu)',
    departure_time: '2026-08-11T13:55:00+08:00',
    arrival_time: '2026-08-11T16:45:00+08:00',
  },
]

async function main() {
  for (const { booking_reference, ...patch } of UPDATES) {
    const { data, error } = await supabase
      .from('transport_items')
      .update(patch)
      .eq('booking_reference', booking_reference)
      .select('booking_reference')
      .maybeSingle()

    if (error) {
      console.error('Fout bij', booking_reference, error)
      process.exit(1)
    }
    if (!data) {
      console.warn('Geen transport_items-rij gevonden voor', booking_reference)
      continue
    }
    console.log('Bijgewerkt:', data.booking_reference)
  }
}

main()
