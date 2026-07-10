import { usePracticalInfo } from '../hooks/usePracticalInfo'
import { FieldRow } from '../components/FieldRow'
import { CurrencyConverter } from '../components/CurrencyConverter'

export function PracticalPage() {
  const { info, loading, error } = usePracticalInfo()

  if (loading) return <div className="notice">Laden…</div>
  if (error) return <div className="notice">{error}</div>

  return (
    <>
      <h2 className="section-title">Praktische informatie</h2>
      <div className="grid">
        <CurrencyConverter />
        {info.map((item) => (
          <div className="list-card" key={item.id}>
            <h3>{item.title}</h3>
            <FieldRow icon="ℹ️" label={item.title} value={item.content} table="practical_info" id={item.id} field="content" />
          </div>
        ))}
      </div>
    </>
  )
}
