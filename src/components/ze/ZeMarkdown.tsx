import React from 'react'

// Formatador enxuto para as respostas do Zé (sem dependência externa).
// Cobre o que o Zé usa: parágrafos, **negrito**, *itálico*, `código`,
// títulos (#), listas (- e 1.), tabelas (| a | b |) e linha horizontal.

function inline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const tok = m[0]
    const k = `${keyBase}-${i++}`
    if (tok.startsWith('**')) out.push(<strong key={k}>{tok.slice(2, -2)}</strong>)
    else if (tok.startsWith('`')) out.push(<code key={k}>{tok.slice(1, -1)}</code>)
    else out.push(<em key={k}>{tok.slice(1, -1)}</em>)
    last = m.index + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l)
const isSeparator = (l: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l)
const cells = (l: string) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())

export const ZeMarkdown: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.replace(/\r/g, '').split('\n')
  const blocks: React.ReactNode[] = []
  let i = 0
  let b = 0

  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim()) { i++; continue }

    // Tabela
    if (isTableRow(line) && i + 1 < lines.length && isSeparator(lines[i + 1])) {
      const head = cells(line)
      const align = cells(lines[i + 1]).map(c => (c.endsWith(':') ? 'right' : 'left') as 'left' | 'right')
      i += 2
      const rows: string[][] = []
      while (i < lines.length && isTableRow(lines[i])) { rows.push(cells(lines[i])); i++ }
      const key = `t${b++}`
      blocks.push(
        <table key={key}>
          <thead>
            <tr>{head.map((h, j) => <th key={j} style={{ textAlign: align[j] }}>{inline(h, `${key}h${j}`)}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>{head.map((_, j) => <td key={j} style={{ textAlign: align[j] }}>{inline(r[j] ?? '', `${key}r${ri}c${j}`)}</td>)}</tr>
            ))}
          </tbody>
        </table>,
      )
      continue
    }

    // Título
    const h = line.match(/^(#{1,4})\s+(.*)$/)
    if (h) {
      const key = `h${b++}`
      const Tag = (h[1].length <= 2 ? 'h3' : 'h4') as 'h3' | 'h4'
      blocks.push(<Tag key={key}>{inline(h[2], key)}</Tag>)
      i++
      continue
    }

    // Linha horizontal
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { blocks.push(<hr key={`r${b++}`} />); i++; continue }

    // Listas
    if (/^\s*([-*•]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line)
      const items: string[] = []
      while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*•]|\d+[.)])\s+/, ''))
        i++
      }
      const key = `l${b++}`
      const List = ordered ? 'ol' : 'ul'
      blocks.push(<List key={key}>{items.map((it, j) => <li key={j}>{inline(it, `${key}-${j}`)}</li>)}</List>)
      continue
    }

    // Parágrafo (junta linhas seguidas)
    const para: string[] = []
    while (
      i < lines.length && lines[i].trim() &&
      !isTableRow(lines[i]) && !/^(#{1,4})\s+/.test(lines[i]) && !/^\s*([-*•]|\d+[.)])\s+/.test(lines[i])
    ) {
      para.push(lines[i])
      i++
    }
    const key = `p${b++}`
    blocks.push(
      <p key={key}>
        {para.map((p, j) => (
          <React.Fragment key={j}>
            {j > 0 && <br />}
            {inline(p, `${key}-${j}`)}
          </React.Fragment>
        ))}
      </p>,
    )
  }

  return <>{blocks}</>
}

export default ZeMarkdown
