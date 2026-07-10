interface PlaceholderPageProps {
  title: string
}

// Tijdelijk — wordt in de volgende stap van de migratie vervangen door de echte pagina.
export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <>
      <h2 className="section-title">{title}</h2>
      <div className="notice">Deze pagina wordt nog gebouwd op React/Supabase.</div>
    </>
  )
}
