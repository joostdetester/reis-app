// Weer via Open-Meteo (publieke, gratis API zonder key). Coördinaten zijn hardcoded
// voor de vaste bestemmingen van deze reis — zelfde aanpak als guessTimeZone in dates.ts.

interface Coords {
  lat: number
  lon: number
}

interface KnownLocation {
  pattern: RegExp
  label: string
  coords: Coords
}

const MANILA: KnownLocation = { pattern: /manila/i, label: 'Manila', coords: { lat: 14.5995, lon: 120.9842 } }

const KNOWN_LOCATIONS: KnownLocation[] = [
  { pattern: /amsterdam|schiphol/i, label: 'Amsterdam', coords: { lat: 52.3676, lon: 4.9041 } },
  { pattern: /muscat/i, label: 'Muscat', coords: { lat: 23.5859, lon: 58.4059 } },
  { pattern: /puerto princesa/i, label: 'Puerto Princesa', coords: { lat: 9.7392, lon: 118.7353 } },
  { pattern: /el nido/i, label: 'El Nido', coords: { lat: 11.1949, lon: 119.4079 } },
  { pattern: /cebu city/i, label: 'Cebu City', coords: { lat: 10.3157, lon: 123.8854 } },
  { pattern: /moalboal/i, label: 'Moalboal', coords: { lat: 9.9435, lon: 123.3944 } },
  { pattern: /siargao|general luna/i, label: 'Siargao', coords: { lat: 9.8482, lon: 126.1633 } },
  MANILA,
]

function guessLocation(locationName: string | null | undefined): KnownLocation {
  if (locationName) {
    const match = KNOWN_LOCATIONS.find((l) => l.pattern.test(locationName))
    if (match) return match
  }
  return MANILA
}

export function guessCoords(locationName: string | null | undefined): Coords {
  return guessLocation(locationName).coords
}

/** Schone plaatsnaam waarvoor het weer wordt opgehaald (bv. voor een transferdag "Amsterdam - Muscat" -> "Amsterdam"). */
export function guessWeatherLabel(locationName: string | null | undefined): string {
  return guessLocation(locationName).label
}

/**
 * Aankomstlocatie van een dag ("Amsterdam - Muscat" of "Manila → Puerto Princesa" -> het
 * laatste deel), voor het weer van een dag-blok: dat is waar je die dag zult zijn/aankomen.
 * Zonder scheidingsteken (een gewone verblijfsdag) blijft de locatie ongewijzigd.
 */
export function arrivalLocation(locationName: string): string {
  const parts = locationName.split(/\s*(?:→|-)\s*/).filter(Boolean)
  return parts[parts.length - 1] ?? locationName
}

interface WeatherCodeInfo {
  emoji: string
  label: string
}

const WEATHER_CODES: Record<number, WeatherCodeInfo> = {
  0: { emoji: '☀️', label: 'Helder' },
  1: { emoji: '🌤️', label: 'Overwegend helder' },
  2: { emoji: '⛅', label: 'Gedeeltelijk bewolkt' },
  3: { emoji: '☁️', label: 'Bewolkt' },
  45: { emoji: '🌫️', label: 'Mist' },
  48: { emoji: '🌫️', label: 'Mist' },
  51: { emoji: '🌦️', label: 'Lichte motregen' },
  53: { emoji: '🌦️', label: 'Motregen' },
  55: { emoji: '🌦️', label: 'Zware motregen' },
  61: { emoji: '🌧️', label: 'Lichte regen' },
  63: { emoji: '🌧️', label: 'Regen' },
  65: { emoji: '🌧️', label: 'Zware regen' },
  80: { emoji: '🌧️', label: 'Lichte buien' },
  81: { emoji: '🌧️', label: 'Buien' },
  82: { emoji: '🌧️', label: 'Hevige buien' },
  95: { emoji: '⛈️', label: 'Onweer' },
  96: { emoji: '⛈️', label: 'Onweer met hagel' },
  99: { emoji: '⛈️', label: 'Zwaar onweer met hagel' },
}

export function weatherCodeInfo(code: number): WeatherCodeInfo {
  return WEATHER_CODES[code] ?? { emoji: '🌡️', label: 'Onbekend' }
}

// Codes die op zichzelf al slecht reisweer betekenen, los van de neerslaghoeveelheid.
const BAD_TRAVEL_CODES = new Set([65, 67, 82, 95, 96, 99])
const HEAVY_RAIN_MM = 20

export interface DailyForecast {
  date: string
  tempMax: number
  tempMin: number
  precipitationSum: number
  weatherCode: number
  windSpeedMax: number
}

export interface CurrentWeather {
  temp: number
  precipitation: number
  weatherCode: number
}

export interface WeatherData {
  current: CurrentWeather
  daily: DailyForecast[]
}

/** Voor deze dag: is er reden om te waarschuwen voor veel regen of slecht reisweer? */
export function isBadTravelWeather(day: DailyForecast): boolean {
  return day.precipitationSum >= HEAVY_RAIN_MM || BAD_TRAVEL_CODES.has(day.weatherCode)
}

export interface BeachScore {
  score: number
  label: string
}

/**
 * Strandcijfer (0-10) op basis van neerslag, wind en temperatuur van die dag —
 * een simpele, transparante afleiding uit de weerdata, geen aparte databron.
 */
export function beachScore(day: DailyForecast): BeachScore {
  let score = 10

  if (day.tempMax < 24) score -= 3
  else if (day.tempMax < 27) score -= 1
  else if (day.tempMax > 34) score -= 1

  score -= Math.min(day.precipitationSum / 5, 5)

  if (day.windSpeedMax > 40) score -= 3
  else if (day.windSpeedMax > 25) score -= 1

  score = Math.max(0, Math.min(10, Math.round(score * 2) / 2))

  const label =
    score >= 8.5
      ? 'Uitstekend strandweer'
      : score >= 7
        ? 'Goed strandweer'
        : score >= 5
          ? 'Matig strandweer'
          : 'Slecht strandweer'

  return { score, label }
}

export async function fetchWeather(coords: Coords, forecastDays = 3): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(coords.lat),
    longitude: String(coords.lon),
    current: 'temperature_2m,precipitation,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,wind_speed_10m_max',
    timezone: 'auto',
    forecast_days: String(forecastDays),
  })
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`)
  if (!response.ok) throw new Error('Weerdata kon niet worden opgehaald')
  const json = await response.json()

  const daily: DailyForecast[] = json.daily.time.map((date: string, i: number) => ({
    date,
    tempMax: json.daily.temperature_2m_max[i],
    tempMin: json.daily.temperature_2m_min[i],
    precipitationSum: json.daily.precipitation_sum[i],
    weatherCode: json.daily.weather_code[i],
    windSpeedMax: json.daily.wind_speed_10m_max[i],
  }))

  return {
    current: {
      temp: json.current.temperature_2m,
      precipitation: json.current.precipitation,
      weatherCode: json.current.weather_code,
    },
    daily,
  }
}

/**
 * Weer voor één specifieke datum (voor een dag-blok in de tijdlijn). Open-Meteo geeft alleen
 * betrouwbare voorspellingen tot ~16 dagen vooruit; buiten dat bereik geeft de API een 400 en
 * geven we `null` terug, zodat de aanroeper dan gewoon niets toont i.p.v. verzonnen data.
 */
export async function fetchDailyWeather(coords: Coords, date: string): Promise<DailyForecast | null> {
  const params = new URLSearchParams({
    latitude: String(coords.lat),
    longitude: String(coords.lon),
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,wind_speed_10m_max',
    timezone: 'auto',
    start_date: date,
    end_date: date,
  })
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`)
  if (!response.ok) return null
  const json = await response.json()
  if (!json.daily?.time?.length) return null

  return {
    date: json.daily.time[0],
    tempMax: json.daily.temperature_2m_max[0],
    tempMin: json.daily.temperature_2m_min[0],
    precipitationSum: json.daily.precipitation_sum[0],
    weatherCode: json.daily.weather_code[0],
    windSpeedMax: json.daily.wind_speed_10m_max[0],
  }
}
