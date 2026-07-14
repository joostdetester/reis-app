import { PHILIPPINES_OUTLINE_PATH } from '../assets/philippinesOutline'
import { projectPhilippines, type Point } from '../utils/geo'

// Uitsnede rond de reisroute (het volledige-land viewBox laat onnodig veel lege zee zien
// boven Luzon en onder Mindanao/Palawan die voor deze route niet relevant is).
const ROUTE_VIEWBOX = '380 380 1300 1150'

interface Waypoint {
  name: string
  lat: number
  lon: number
  labelSide?: 'left'
}

const MANILA: Waypoint = { name: 'Manila', lat: 14.5995, lon: 120.9842 }
const PUERTO_PRINCESA: Waypoint = { name: 'Puerto Princesa', lat: 9.7392, lon: 118.7353 }
const EL_NIDO: Waypoint = { name: 'El Nido', lat: 11.1949, lon: 119.409 }
const CEBU: Waypoint = { name: 'Cebu', lat: 10.3157, lon: 123.8854 }
const SIARGAO: Waypoint = { name: 'Siargao', lat: 9.86, lon: 126.05, labelSide: 'left' }

const WAYPOINTS = [MANILA, PUERTO_PRINCESA, EL_NIDO, CEBU, SIARGAO]

interface Leg {
  from: Waypoint
  to: Waypoint
  date: string
  flight: boolean
  label?: string
  bend: number
}

const LEGS: Leg[] = [
  { from: MANILA, to: PUERTO_PRINCESA, date: '25 jul', flight: true, bend: -0.12 },
  { from: PUERTO_PRINCESA, to: EL_NIDO, date: '28 jul', flight: false, bend: -0.15 },
  { from: EL_NIDO, to: CEBU, date: '1 aug', flight: true, bend: 0.2 },
  { from: CEBU, to: SIARGAO, date: '7 aug', flight: true, bend: 0.18 },
  { from: SIARGAO, to: MANILA, date: '11 aug', flight: true, label: 'via Cebu', bend: 0.28 },
]

/** Kwadratische Bézier-boog tussen twee punten; `bend` is de uitwijking loodrecht op de lijn (fractie van de lengte). */
function arc(p1: Point, p2: Point, bend: number) {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const midX = (p1.x + p2.x) / 2
  const midY = (p1.y + p2.y) / 2
  const controlX = midX - dy * bend
  const controlY = midY + dx * bend
  // Middelpunt van de kwadratische Bézier + raaklijnhoek (die valt hier samen met de hoek P1->P2).
  const pointX = 0.25 * p1.x + 0.5 * controlX + 0.25 * p2.x
  const pointY = 0.25 * p1.y + 0.5 * controlY + 0.25 * p2.y
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI
  return {
    d: `M${p1.x},${p1.y} Q${controlX},${controlY} ${p2.x},${p2.y}`,
    mid: { x: pointX, y: pointY },
    angle,
  }
}

export function RouteMap() {
  return (
    <svg viewBox={ROUTE_VIEWBOX} className="route-map">
      <path d={PHILIPPINES_OUTLINE_PATH} fill="var(--gold)" stroke="none" />

      {(() => {
        const manilaPos = projectPhilippines(MANILA.lat, MANILA.lon)
        const abroad = arc(manilaPos, { x: manilaPos.x - 160, y: manilaPos.y - 260 }, 0.1)
        return (
          <g>
            <path d={abroad.d} fill="none" stroke="var(--sea)" strokeWidth={4} strokeDasharray="14 10" />
            <text
              x={abroad.mid.x - 10}
              y={abroad.mid.y - 10}
              fontSize={30}
              textAnchor="end"
              fontWeight={800}
              fill="var(--ink)"
            >
              ✈️ Amsterdam ↔ Muscat
            </text>
            <text x={abroad.mid.x - 10} y={abroad.mid.y + 26} fontSize={26} textAnchor="end" fill="var(--ink)">
              23 jul &amp; 13 aug
            </text>
          </g>
        )
      })()}

      {LEGS.map((leg) => {
        const p1 = projectPhilippines(leg.from.lat, leg.from.lon)
        const p2 = projectPhilippines(leg.to.lat, leg.to.lon)
        const { d, mid, angle } = arc(p1, p2, leg.bend)

        return (
          <g key={`${leg.from.name}-${leg.to.name}`}>
            <path
              d={d}
              fill="none"
              stroke="var(--sea)"
              strokeWidth={5}
              strokeDasharray={leg.flight ? undefined : '4 14'}
              strokeLinecap="round"
            />
            {leg.flight && (
              <text x={mid.x} y={mid.y} fontSize={40} textAnchor="middle" transform={`rotate(${angle} ${mid.x} ${mid.y})`}>
                ✈️
              </text>
            )}
            <text x={mid.x} y={mid.y + (leg.flight ? 44 : 8)} fontSize={26} textAnchor="middle" fontWeight={800} fill="var(--ink)">
              {leg.date}
              {leg.label ? ` (${leg.label})` : ''}
            </text>
          </g>
        )
      })}

      {WAYPOINTS.map((place) => {
        const { x, y } = projectPhilippines(place.lat, place.lon)
        const onLeft = place.labelSide === 'left'
        return (
          <g key={place.name}>
            <circle cx={x} cy={y} r={12} fill="var(--danger)" stroke="#fff" strokeWidth={3} />
            <text
              x={onLeft ? x - 18 : x + 18}
              y={y + 9}
              fontSize={32}
              fontWeight={800}
              textAnchor={onLeft ? 'end' : 'start'}
              fill="var(--ink)"
            >
              {place.name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
