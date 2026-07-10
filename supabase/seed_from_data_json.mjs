// Eenmalig migratiescript: leest data.json en zet het om naar trip_days,
// accommodations, trip_day_accommodations en transport_items in Supabase.
//
// Gebruik (met de service-role key, NOOIT in de frontend/.env.local):
//   node --env-file=supabase/.env.seed supabase/seed_from_data_json.mjs
//
// Idempotent: bestaande trip_days/accommodations/transport_items van deze trip
// worden eerst verwijderd (cascade ruimt trip_day_accommodations mee op), zodat
// je het script veilig opnieuw kunt draaien na een correctie in data.json.

import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TRIP_SLUG = process.env.TRIP_SLUG

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !TRIP_SLUG) {
  console.error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY en TRIP_SLUG zijn verplicht (zie supabase/.env.seed).')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const NIET_INGEVULD = new Set(['-', '', 'Nog in te vullen'])
const isIngevuld = (value) => value && !NIET_INGEVULD.has(value)

function transportStatus(carrier) {
  if (carrier && /nog (te )?regelen/i.test(carrier)) return 'nog_te_boeken'
  return 'vast'
}

async function main() {
  const raw = await readFile(new URL('../data.json', import.meta.url), 'utf-8')
  const days = JSON.parse(raw)

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id')
    .eq('slug', TRIP_SLUG)
    .single()

  if (tripError || !trip) {
    console.error('Trip niet gevonden voor slug', TRIP_SLUG, tripError)
    process.exit(1)
  }
  const tripId = trip.id
  console.log('Trip gevonden:', tripId)

  // Opruimen voor herhaalbare runs.
  await supabase.from('transport_items').delete().eq('trip_id', tripId)
  await supabase.from('trip_days').delete().eq('trip_id', tripId)
  await supabase.from('accommodations').delete().eq('trip_id', tripId)

  const dataIssues = []

  // 1. trip_days
  const tripDayRows = days.map((day, index) => ({
    trip_id: tripId,
    travel_date: day.date,
    location: day.location,
    island: day.island,
    day_type: day.status === 'reisdag' ? 'reisdag' : 'verblijfsdag',
    morning_text: isIngevuld(day.morning) ? day.morning : null,
    afternoon_text: isIngevuld(day.afternoon) ? day.afternoon : null,
    evening_text: isIngevuld(day.evening) ? day.evening : null,
    notes: day.notes || null,
    sort_order: index,
  }))

  const { data: insertedDays, error: daysError } = await supabase
    .from('trip_days')
    .insert(tripDayRows)
    .select('id, travel_date')

  if (daysError) {
    console.error('Fout bij invoegen trip_days:', daysError)
    process.exit(1)
  }
  console.log(`${insertedDays.length} trip_days aangemaakt.`)

  const dayIdByDate = new Map(insertedDays.map((d) => [d.travel_date, d.id]))

  // 2. accommodations — uniek per naam
  const uniqueHotelNames = [...new Set(days.map((d) => d.hotel).filter(isIngevuld))]
  const accommodationIdByName = new Map()

  for (const name of uniqueHotelNames) {
    const { data: acc, error: accError } = await supabase
      .from('accommodations')
      .insert({
        trip_id: tripId,
        name,
        address: null,
        check_in: null,
        check_out: null,
        booking_reference: null,
        phone: null,
        maps_url: null,
      })
      .select('id')
      .single()

    if (accError) {
      console.error('Fout bij invoegen accommodation', name, accError)
      process.exit(1)
    }
    accommodationIdByName.set(name, acc.id)
    dataIssues.push(`Accommodation "${name}": adres, check-in/out en telefoon ontbreken nog.`)
  }
  console.log(`${uniqueHotelNames.length} accommodations aangemaakt.`)

  // 3. trip_day_accommodations
  const linkRows = days
    .filter((d) => isIngevuld(d.hotel))
    .map((d) => ({
      trip_id: tripId,
      trip_day_id: dayIdByDate.get(d.date),
      accommodation_id: accommodationIdByName.get(d.hotel),
    }))

  if (linkRows.length > 0) {
    const { error: linkError } = await supabase.from('trip_day_accommodations').insert(linkRows)
    if (linkError) {
      console.error('Fout bij koppelen trip_day_accommodations:', linkError)
      process.exit(1)
    }
  }
  console.log(`${linkRows.length} trip_day_accommodations gekoppeld.`)

  // 4. transport_items — één per dag met vervoer
  const transportRows = days
    .filter((d) => isIngevuld(d.transport))
    .map((d) => {
      if (!d.booking) dataIssues.push(`Transport op ${d.date} (${d.transport}): boekingsnummer ontbreekt nog.`)
      if (!isIngevuld(d.carrier)) dataIssues.push(`Transport op ${d.date} (${d.transport}): vervoerder ontbreekt nog.`)
      dataIssues.push(
        `Transport op ${d.date}: exacte vertrek-/aankomstlocatie en -tijd niet los beschikbaar (zit evt. in ochtend/middag/avond-tekst).`,
      )
      return {
        trip_id: tripId,
        trip_day_id: dayIdByDate.get(d.date),
        type: d.transport,
        carrier: isIngevuld(d.carrier) ? d.carrier : null,
        booking_reference: d.booking || null,
        origin: null,
        destination: null,
        departure_time: null,
        arrival_time: null,
        maps_url: null,
        status: transportStatus(d.carrier),
      }
    })

  if (transportRows.length > 0) {
    const { error: transportError } = await supabase.from('transport_items').insert(transportRows)
    if (transportError) {
      console.error('Fout bij invoegen transport_items:', transportError)
      process.exit(1)
    }
  }
  console.log(`${transportRows.length} transport_items aangemaakt.`)

  console.log('\nOpenstaande datakwaliteitspunten (uit PROJECT_CONTEXT.md, niet stilzwijgend gegokt):')
  for (const issue of dataIssues) console.log(' -', issue)

  console.log('\nSeed voltooid.')
}

main()
