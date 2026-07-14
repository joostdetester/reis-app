const dayFormatter = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
const shortFormatter = new Intl.DateTimeFormat('nl-NL', { day: '2-digit', month: '2-digit' })

/** Parseert een 'YYYY-MM-DD'-datum op het middaguur lokale tijd, zodat tijdzone-verschuiving nooit een dag laat wisselen. */
function parseDate(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00`)
}

export function fmtDate(isoDate: string): string {
  return dayFormatter.format(parseDate(isoDate))
}

export function shortDate(isoDate: string): string {
  return shortFormatter.format(parseDate(isoDate))
}

export function todayIso(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

/** Index van vandaag in een lijst met dagen (op travel_date), of 0 als vandaag niet in de lijst voorkomt. */
export function todayIndex<T extends { travel_date: string }>(days: T[], now: Date = new Date()): number {
  const today = todayIso(now)
  const index = days.findIndex((d) => d.travel_date === today)
  return index >= 0 ? index : 0
}

export interface Countdown {
  text: string
  isStarted: boolean
}

export function countdownTo(departureIso: string, now: Date = new Date()): Countdown {
  const diffMs = new Date(departureIso).getTime() - now.getTime()
  if (diffMs <= 0) return { text: 'Reis gestart', isStarted: true }
  const days = Math.ceil(diffMs / 86_400_000)
  return { text: `${days} ${days === 1 ? 'dag' : 'dagen'}`, isStarted: false }
}

/** Uren tot een tijdstip; null als het al voorbij is. Voor de 24-uurs vervoersafteller. */
export function hoursUntil(iso: string, now: Date = new Date()): number | null {
  const diffMs = new Date(iso).getTime() - now.getTime()
  if (diffMs <= 0) return null
  return Math.ceil(diffMs / 3_600_000)
}

export type FlightStatusWindow = 'before' | 'active' | 'after'

/**
 * Venster waarin het zin heeft de vluchtstatus-API te bevragen: vanaf `beforeHours` uur
 * vóór vertrek tot `afterHours` uur na aankomst. Ver vooruit is er nog niets bekend, en
 * lang na aankomst blijft het resultaat toch hetzelfde — beide zijn dus verspilde quota.
 */
export function flightStatusWindow(
  departureIso: string,
  arrivalIso: string | null,
  now: Date = new Date(),
  beforeHours = 48,
  afterHours = 24,
): FlightStatusWindow {
  const departure = new Date(departureIso).getTime()
  const reference = arrivalIso ? new Date(arrivalIso).getTime() : departure
  const nowMs = now.getTime()
  if (nowMs < departure - beforeHours * 3_600_000) return 'before'
  if (nowMs > reference + afterHours * 3_600_000) return 'after'
  return 'active'
}

// We slaan geen tijdzone per traject op, dus deze herkent een handjevol vaste
// namen uit dit specifieke reisschema. Alles wat niet matcht valt terug op
// Asia/Manila — correct voor vrijwel elke binnenlandse Filipijnse locatie.
const LOCATION_TIMEZONES: [pattern: RegExp, zone: string][] = [
  [/amsterdam|schiphol/i, 'Europe/Amsterdam'],
  [/muscat/i, 'Asia/Muscat'],
]

export function guessTimeZone(locationName: string | null | undefined): string {
  if (locationName) {
    for (const [pattern, zone] of LOCATION_TIMEZONES) {
      if (pattern.test(locationName)) return zone
    }
  }
  return 'Asia/Manila'
}

/** Datum (YYYY-MM-DD) van een timestamptz in een gegeven tijdzone. Voor het opzoeken van een vlucht op de juiste lokale vertrekdatum. */
export function isoDateInZone(iso: string, timeZone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

/** Toont een timestamptz in de lokale tijd van `locationName` (zie guessTimeZone). */
export function fmtLocalDateTime(iso: string, locationName: string | null | undefined): string {
  return new Intl.DateTimeFormat('nl-NL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: guessTimeZone(locationName),
  }).format(new Date(iso))
}

/** Verschil (in minuten) tussen `timeZone` en UTC, op het gegeven moment (houdt rekening met zomertijd). */
function zoneOffsetMinutes(date: Date, timeZone: string): number {
  const asZoned = new Date(date.toLocaleString('en-US', { timeZone }))
  const asUtc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
  return (asZoned.getTime() - asUtc.getTime()) / 60_000
}

/** Zet een timestamptz om naar een waarde voor een `<input type="datetime-local">`, in de klokstijd van `timeZone`. */
export function toDatetimeLocalValue(iso: string, timeZone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

/** Keert `toDatetimeLocalValue` om: leest een datetime-local waarde als klokstijd in `timeZone` en geeft de bijbehorende timestamptz (ISO, UTC) terug. */
export function fromDatetimeLocalValue(value: string, timeZone: string): string {
  const asIfUtc = new Date(`${value}:00Z`)
  const offsetMinutes = zoneOffsetMinutes(asIfUtc, timeZone)
  return new Date(asIfUtc.getTime() - offsetMinutes * 60_000).toISOString()
}

/** Vertrektijd in lokale tijd vertrekland, met de aankomsttijd (lokale tijd aankomstland) erachter tussen haakjes. */
export function formatFlightTimes(
  departureTime: string | null,
  arrivalTime: string | null,
  origin: string | null | undefined,
  destination: string | null | undefined,
): string | null {
  const departure = departureTime ? fmtLocalDateTime(departureTime, origin) : null
  const arrival = arrivalTime ? fmtLocalDateTime(arrivalTime, destination) : null
  if (departure && arrival) return `${departure} (${arrival})`
  return departure ?? arrival
}

/** Trekt een aantal uren van een timestamptz af. */
export function subtractHours(iso: string, hours: number): Date {
  return new Date(new Date(iso).getTime() - hours * 3_600_000)
}

/** Korte plaatsnaam voor tijdzone-labels, bv. "Amsterdam (AMS)" -> "Amsterdam". */
export function cityLabel(locationName: string | null | undefined): string {
  if (!locationName) return ''
  return locationName.split('(')[0].trim()
}

/** Duur tussen twee timestamptz-waarden, als "Xu Ym" (tijdzone-onafhankelijk). */
export function formatDuration(startIso: string, endIso: string): string {
  const totalMinutes = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes > 0 ? `${hours}u ${minutes}m` : `${hours}u`
}

/** Duur tussen twee timestamptz-waarden, als "U:MM" (bv. vluchtduur "1:40"). */
export function formatDurationHM(startIso: string, endIso: string): string {
  const totalMinutes = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}:${String(minutes).padStart(2, '0')}`
}

/** Dagdeel (ochtend/middag/avond) van een tijdstip, in een gegeven tijdzone. */
export function dayPartOf(date: Date, timeZone: string): 'ochtend' | 'middag' | 'avond' {
  const hour = Number(new Intl.DateTimeFormat('en-US', { hour: '2-digit', hour12: false, timeZone }).format(date))
  if (hour >= 6 && hour < 12) return 'ochtend'
  if (hour >= 12 && hour < 18) return 'middag'
  return 'avond'
}

const manilaTimeFormatter = new Intl.DateTimeFormat('nl-NL', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Manila',
})

/** Voor hotel in-/uitchecktijden: één vaste locatie, dus Filipijnse lokale tijd is ondubbelzinnig. */
export function fmtPhilippineTime(iso: string): string {
  return manilaTimeFormatter.format(new Date(iso))
}

const manilaShortDateFormatter = new Intl.DateTimeFormat('nl-NL', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'Asia/Manila',
})

/** Alleen de datum (dd-mm) van een timestamptz, in Filipijnse lokale tijd. Voor verblijfsdata op basis van check_in/check_out. */
export function fmtPhilippineDate(iso: string): string {
  return manilaShortDateFormatter.format(new Date(iso))
}

/** Huidige kloktijd (HH:MM) in een gegeven IANA-tijdzone, voor de live klokjes in de header. */
export function formatTimeInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', minute: '2-digit', timeZone }).format(date)
}

export type TripPhase = 'before' | 'during' | 'after'

/** Bepaalt of de reis nog moet beginnen, aan de gang is, of al voorbij is (op basis van travel_date-range). */
export function tripPhase<T extends { travel_date: string }>(days: T[], now: Date = new Date()): TripPhase {
  if (days.length === 0) return 'before'
  const today = todayIso(now)
  if (today < days[0].travel_date) return 'before'
  if (today > days[days.length - 1].travel_date) return 'after'
  return 'during'
}
