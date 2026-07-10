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
