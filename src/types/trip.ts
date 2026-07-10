export type DayType = 'reisdag' | 'verblijfsdag'

export interface TripDay {
  id: string
  trip_id: string
  travel_date: string
  location: string
  island: string
  day_type: DayType
  morning_text: string | null
  afternoon_text: string | null
  evening_text: string | null
  notes: string | null
  sort_order: number
  updated_at: string
}

export interface Accommodation {
  id: string
  trip_id: string
  name: string
  address: string | null
  check_in: string | null
  check_out: string | null
  booking_reference: string | null
  phone: string | null
  maps_url: string | null
  photo_url: string | null
  updated_at: string
}

export interface TripDayAccommodation {
  trip_id: string
  trip_day_id: string
  accommodation_id: string
}

export type TransportStatus = 'vast' | 'optioneel' | 'nog_te_boeken'

export interface TransportItem {
  id: string
  trip_id: string
  trip_day_id: string
  type: string
  carrier: string | null
  booking_reference: string | null
  origin: string | null
  destination: string | null
  departure_time: string | null
  arrival_time: string | null
  departure_terminal: string | null
  departure_gate: string | null
  arrival_terminal: string | null
  delay_minutes: number | null
  maps_url: string | null
  status: string | null
  updated_at: string
}

export type ActivityStatus = 'vast' | 'optioneel' | 'nog_te_boeken'
export type ActivityDayPart = 'ochtend' | 'middag' | 'avond'

export interface Activity {
  id: string
  trip_id: string
  trip_day_id: string
  title: string
  day_part: ActivityDayPart
  exact_time: string | null
  status: ActivityStatus
  category: string | null
  address: string | null
  maps_url: string | null
  updated_at: string
}

export interface DiveShop {
  name: string
  url: string
  distance_from_hotel: string
  price_indication: string
  rating?: number
  rating_count?: number
}

export interface Destination {
  id: string
  trip_id: string
  name: string
  summary: string | null
  restaurants: unknown
  practical_tips: unknown
  bad_weather_alternatives: unknown
  dive_shops: DiveShop[] | null
  photo_url: string | null
}

export interface PracticalInfo {
  id: string
  trip_id: string
  section: string
  title: string
  content: string
  sort_order: number
}

export interface Trip {
  id: string
  name: string
  slug: string
  start_date: string
  end_date: string
  created_at: string
}
