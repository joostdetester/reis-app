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

const dateTimeFormatter = new Intl.DateTimeFormat('nl-NL', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
})

/**
 * Toont een timestamptz in UTC (niet in de tijdzone van de kijker!). We slaan geen
 * lokale tijdzone per traject op, dus "20:25 lokale tijd op Schiphol" zou anders
 * stilzwijgend verkeerd worden weergegeven op een telefoon die al in Manila zit.
 */
export function fmtDateTime(iso: string): string {
  return `${dateTimeFormatter.format(new Date(iso))} UTC`
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
