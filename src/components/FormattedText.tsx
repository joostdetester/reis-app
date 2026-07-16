import { Fragment, type ReactNode } from 'react'

const BOLD_PATTERN = /\*\*([^*]+)\*\*/g
const BULLET_PATTERN = /^[-•]\s+/

/** Splits one line into runs, turning `**bold**` into <strong>. */
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let i = 0
  BOLD_PATTERN.lastIndex = 0
  while ((match = BOLD_PATTERN.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index))
    nodes.push(<strong key={i++}>{match[1]}</strong>)
    lastIndex = BOLD_PATTERN.lastIndex
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes
}

interface Group {
  bullet: boolean
  lines: string[]
}

/** Groups consecutive lines by whether they start with `- `/`• `, so a run of bullet lines becomes one <ul>. */
function groupLines(text: string): Group[] {
  const groups: Group[] = []
  for (const line of text.split('\n')) {
    const bullet = BULLET_PATTERN.test(line)
    const content = bullet ? line.replace(BULLET_PATTERN, '') : line
    const last = groups[groups.length - 1]
    if (last && last.bullet === bullet) {
      last.lines.push(content)
    } else {
      groups.push({ bullet, lines: [content] })
    }
  }
  return groups
}

/**
 * Rendert vrije tekst (dagdeel-teksten, notities, praktische info) met behoud van
 * Enters (vereist `white-space: pre-wrap` op de omliggende container), `- `/`• `-
 * regels als echte opsommingslijst, en `**vet**` als <strong>. De platte string
 * blijft de opslagvorm in Supabase - dit is puur presentatie bij het renderen.
 */
export function FormattedText({ text }: { text: string }) {
  const groups = groupLines(text)
  return (
    <>
      {groups.map((group, gi) =>
        group.bullet ? (
          <ul key={gi}>
            {group.lines.map((line, li) => (
              <li key={li}>{renderInline(line)}</li>
            ))}
          </ul>
        ) : (
          <Fragment key={gi}>
            {group.lines.map((line, li) => (
              <Fragment key={li}>
                {li > 0 && '\n'}
                {renderInline(line)}
              </Fragment>
            ))}
          </Fragment>
        ),
      )}
    </>
  )
}
