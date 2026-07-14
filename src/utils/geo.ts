// Projectie gekalibreerd op de omtrek in ../assets/philippinesOutline.ts (dezelfde bron,
// Natural Earth 1:50m): een simpele lineaire (equirechthoekige) projectie van lengte-/
// breedtegraad naar diezelfde SVG-coördinaten, gecontroleerd door Manila, Puerto Princesa,
// El Nido, Cebu City en Siargao op de kaart te plotten en visueel te vergelijken.
const SCALE_X = 1208.8 / (126.605 - 116.928)
const SCALE_Y = 2000 / (21.12 - 4.587)
const X0 = 395.6
const LON0 = 116.928
const LAT_TOP = 21.12

export interface Point {
  x: number
  y: number
}

export function projectPhilippines(lat: number, lon: number): Point {
  return {
    x: X0 + (lon - LON0) * SCALE_X,
    y: (LAT_TOP - lat) * SCALE_Y,
  }
}
