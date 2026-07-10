import { useState } from 'react'
import { EditSheet } from './EditSheet'
import { saveEdit } from '../lib/saveEdit'

interface FieldRowProps {
  icon: string
  label: string
  value: string | null
  table: string
  id: string
  field: string
  placeholder?: string
}

/** Eén bewerkbaar veld: icoon, label, waarde en een "Bewerk"-knop die het bevestigingssheet opent. */
export function FieldRow({ icon, label, value, table, id, field, placeholder = '-' }: FieldRowProps) {
  const [editing, setEditing] = useState(false)

  async function handleSave(newValue: string) {
    await saveEdit(table, id, { [field]: newValue || null })
    setEditing(false)
  }

  return (
    <div className="row">
      <div>{icon}</div>
      <div>
        <div className="kicker">{label}</div>
        <div className="value">{value || placeholder}</div>
      </div>
      <button className="edit" onClick={() => setEditing(true)}>
        Bewerk
      </button>
      {editing && (
        <EditSheet label={label} value={value ?? ''} onCancel={() => setEditing(false)} onSave={handleSave} />
      )}
    </div>
  )
}
