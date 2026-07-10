import type { TripDay } from '../types/trip'

// "Europa" in trip_days.island staat voor deze specifieke reis altijd voor Amsterdam.
const ISLAND_ALIASES: Record<string, string> = { Europa: 'Amsterdam' }

function normalize(name: string): string {
  const trimmed = name.trim()
  return ISLAND_ALIASES[trimmed] ?? trimmed
}

export interface DestinationBlock {
  name: string
  days: TripDay[]
}

export type FlightContext = 'arrival' | 'departure' | 'both'

/**
 * Bepaalt of een vlucht op een bepaalde dag, binnen dit blok, een aankomst is (eerste
 * dag van het blok), een vertrek (laatste dag), of allebei tegelijk (eendagsblok):
 * dan beslist of het de eerste dag van de hele reis is (vertrek) of de laatste (aankomst).
 */
export function flightContext(tripDayId: string, block: DestinationBlock, totalDays: number): FlightContext {
  const firstDay = block.days[0]
  const lastDay = block.days[block.days.length - 1]
  const isFirst = tripDayId === firstDay.id
  const isLast = tripDayId === lastDay.id

  if (isFirst && !isLast) return 'arrival'
  if (isLast && !isFirst) return 'departure'
  if (isFirst && isLast) {
    if (firstDay.sort_order === 0) return 'departure'
    if (firstDay.sort_order === totalDays - 1) return 'arrival'
  }
  return 'both'
}

function buildIslandBlocks(days: TripDay[]): DestinationBlock[] {
  const blocks: DestinationBlock[] = []

  for (const day of days) {
    const parts = day.island.split('→').map(normalize)

    if (parts.length === 1) {
      const [name] = parts
      const current = blocks[blocks.length - 1]
      if (current?.name === name) {
        current.days.push(day)
      } else {
        blocks.push({ name, days: [day] })
      }
      continue
    }

    const [fromName, toName] = parts
    const current = blocks[blocks.length - 1]
    if (current?.name === fromName) {
      current.days.push(day)
    } else {
      blocks.push({ name: fromName, days: [day] })
    }
    blocks.push({ name: toName, days: [day] })
  }

  return blocks
}

// Sommige eilanden worden op twee duidelijk verschillende plekken bezocht. De
// brontekst markeert die overgang niet altijd met een pijl (bv. Cebu City ->
// Moalboal gebeurt stilzwijgend), dus we herkennen de plek via de bekende namen
// in trip_days.location in plaats van op exacte gelijkheid van dat hele veld.
const SUB_LOCATIONS: Record<string, string[]> = {
  Palawan: ['Puerto Princesa', 'El Nido'],
  Cebu: ['Cebu City', 'Moalboal'],
}

function splitBySubLocation(block: DestinationBlock): DestinationBlock[] {
  const candidates = SUB_LOCATIONS[block.name]
  if (!candidates) return [block]

  const subBlocks: DestinationBlock[] = []

  for (const day of block.days) {
    const matches = candidates.filter((c) => day.location.includes(c))

    if (matches.length >= 2) {
      // Transferdag tussen twee bekende plekken binnen dit eiland (bv. "Puerto Princesa → El Nido").
      const [fromLoc, toLoc] = [...matches].sort((a, b) => day.location.indexOf(a) - day.location.indexOf(b))
      const current = subBlocks[subBlocks.length - 1]
      const fromName = `${block.name} - ${fromLoc}`
      if (current?.name === fromName) {
        current.days.push(day)
      } else {
        subBlocks.push({ name: fromName, days: [day] })
      }
      subBlocks.push({ name: `${block.name} - ${toLoc}`, days: [day] })
      continue
    }

    const subLoc = matches[0]
    if (!subLoc) {
      // Dag binnen dit eiland matcht geen bekende plek: bij het lopende sub-blok houden
      // (of, als er nog geen is, gewoon als eiland zelf) i.p.v. de dag laten verdwijnen.
      const current = subBlocks[subBlocks.length - 1]
      if (current) {
        current.days.push(day)
      } else {
        subBlocks.push({ name: block.name, days: [day] })
      }
      continue
    }

    const name = `${block.name} - ${subLoc}`
    const current = subBlocks[subBlocks.length - 1]
    if (current?.name === name) {
      current.days.push(day)
    } else {
      subBlocks.push({ name, days: [day] })
    }
  }

  return subBlocks
}

/**
 * Bouwt aaneengesloten bestemmingsblokken uit de dagenlijst: een transferdag
 * ("Luzon → Palawan") is de laatste dag van het ene blok én de eerste dag van
 * het volgende, in plaats van een eigen los blok. Eenzelfde bestemming die
 * niet-aaneengesloten opnieuw wordt bezocht (bv. Luzon heen én terug) levert
 * bewust twee aparte blokken op, niet één met een gat erin. Eilanden met twee
 * duidelijk verschillende bezochte plekken (Palawan, Cebu) worden daarna verder
 * opgesplitst per plek.
 */
export function buildDestinationBlocks(days: TripDay[]): DestinationBlock[] {
  return buildIslandBlocks(days).flatMap(splitBySubLocation)
}
