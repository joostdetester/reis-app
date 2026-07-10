// Eenmalig: vult check-in/checkout-tijden, boekingsnummers en (waar op de
// Booking.com-bevestiging zichtbaar) het adres in voor de 6 overnachtingen
// die de gebruiker via screenshots heeft aangeleverd.
//
// Gebruik: node --env-file=supabase/.env.seed supabase/seed_hotel_checkin_boekingen.mjs

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const TRIP_SLUG = process.env.TRIP_SLUG

const UPDATES = [
  {
    name: 'Altremaru Jungle Retreat',
    check_in: '2026-07-25T14:00:00+08:00',
    check_out: '2026-07-28T12:00:00+08:00',
    booking_reference: '5918697507',
    address: 'Barangay Buenavista, Purok Madahon, 5300 Puerto Princesa, Palawan, Filipijnen',
  },
  {
    name: 'El Nido Moringa Resort',
    check_in: '2026-07-28T14:00:00+08:00',
    check_out: '2026-08-01T12:00:00+08:00',
    booking_reference: '6629795264',
  },
  {
    name: 'Work-friendly mountain view condo near SM Seaside',
    check_in: '2026-08-01T15:00:00+08:00',
    check_out: '2026-08-03T12:00:00+08:00',
    booking_reference: '6780706931',
  },
  {
    name: 'Secret Paradise',
    check_in: '2026-08-03T14:00:00+08:00',
    check_out: '2026-08-07T11:00:00+08:00',
    booking_reference: '6355187193',
  },
  {
    name: 'Terra Siargao',
    check_in: '2026-08-07T14:00:00+08:00',
    check_out: '2026-08-11T11:00:00+08:00',
    booking_reference: '5471725812',
  },
  {
    name: 'Modern Oasis: pool en Netflix',
    check_in: '2026-08-11T14:00:00+08:00',
    check_out: '2026-08-13T12:30:00+08:00',
    booking_reference: '5874668503',
    address: 'Asiana Oasis, Ephesus Street, Parañaque, 1708 Metro Manila, Filipijnen',
  },
]

async function main() {
  const { data: trip, error: tripError } = await supabase.from('trips').select('id').eq('slug', TRIP_SLUG).single()
  if (tripError || !trip) {
    console.error('Trip niet gevonden voor slug', TRIP_SLUG, tripError)
    process.exit(1)
  }

  for (const update of UPDATES) {
    const { name, ...fields } = update
    const { error, data } = await supabase
      .from('accommodations')
      .update(fields)
      .eq('trip_id', trip.id)
      .eq('name', name)
      .select('id')

    if (error) {
      console.error(`Fout bij updaten van "${name}":`, error)
      process.exit(1)
    }
    if (!data || data.length === 0) {
      console.error(`Geen accommodatie gevonden met naam "${name}"`)
      process.exit(1)
    }
    console.log(`Bijgewerkt: ${name}`)
  }
}

main()
