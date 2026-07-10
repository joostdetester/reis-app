/** Simpele vrije-tekstzoekfunctie over een heel record, zoals de zoekpagina en de tijdlijn gebruiken. */
export function matchesQuery(record: unknown, query: string): boolean {
  if (!query.trim()) return true
  return JSON.stringify(record).toLowerCase().includes(query.toLowerCase())
}
