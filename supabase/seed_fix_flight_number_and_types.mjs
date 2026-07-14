// Eenmalig: corrigeert het vluchtnummer van de Manila -> Puerto Princesa vlucht
// (stond fout als boekingscode "9J9NSZ" i.p.v. het echte Cebu Pacific-vluchtnummer)
// en benoemt vluchten consistent als "Internationale vlucht" of "Binnenlandse vlucht"
// (was tot nu toe alleen "Vlucht" voor sommige vluchten).
//
// Gebruik: node --env-file=supabase/.env.seed supabase/seed_fix_flight_number_and_types.mjs

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const UPDATES = [
  {
    booking_reference: '9J9NSZ', // Manila -> Puerto Princesa, 25 juli: was een boekingscode, geen vluchtnummer
    patch: { booking_reference: '5J635', type: 'Binnenlandse vlucht' },
  },
  {
    booking_reference: 'WY843', // Muscat -> Manila, 24 juli: ook internationaal, stond nog als "Vlucht"
    patch: { type: 'Internationale vlucht' },
  },
  {
    booking_reference: 'DG6255', // El Nido -> Cebu, 1 aug
    patch: { type: 'Binnenlandse vlucht + taxi' },
  },
  {
    booking_reference: 'PR2382', // Cebu -> Siargao, 7 aug
    patch: { type: 'Binnenlandse vlucht' },
  },
  {
    booking_reference: 'PR2352 / PR2868', // Siargao -> Manila (via Cebu), 11 aug
    patch: { type: 'Binnenlandse vlucht' },
  },
]

async function main() {
  for (const { booking_reference, patch } of UPDATES) {
    const { data, error } = await supabase
      .from('transport_items')
      .update(patch)
      .eq('booking_reference', booking_reference)
      .select('booking_reference, type')
      .maybeSingle()

    if (error) {
      console.error('Fout bij', booking_reference, error)
      process.exit(1)
    }
    if (!data) {
      console.warn('Geen transport_items-rij gevonden voor', booking_reference)
      continue
    }
    console.log('Bijgewerkt:', booking_reference, '->', data.booking_reference, '/', data.type)
  }
}

main()
