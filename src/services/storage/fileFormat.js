import { STORAGE_FORMAT_VERSION } from './datasets'

const HEADER_RE = /^#\s*finance-app\/(.+)$/
const SCHEMA_RE = /^#\s*schema:\s*(\d+)$/
const UPDATED_RE = /^#\s*updatedAt:\s*(.+)$/

/**
 * Serializa um payload em um arquivo `.txt` legível:
 *
 *   # finance-app/fluxo-caixa.txt
 *   # schema: 2
 *   # updatedAt: 2026-10-22T14:03:11.000Z
 *   { ... }
 */
export function serializeFile(datasetKey, file, schema, data, updatedAt = new Date().toISOString()) {
  const header = [
    `# finance-app/${file}`,
    `# schema: ${schema}`,
    `# updatedAt: ${updatedAt}`,
    `# format: ${STORAGE_FORMAT_VERSION}`,
  ].join('\n')

  return `${header}\n${JSON.stringify(data, null, 2)}\n`
}

/**
 * Faz o parse de um arquivo `.txt` gerado por `serializeFile`.
 * Retorna `null` quando o arquivo não existe ou está vazio.
 */
export function parseFile(raw) {
  if (raw === null || raw === undefined) return null
  const text = String(raw)
  if (!text.trim()) return null

  const lines = text.split('\n')
  const meta = { file: null, schema: 1, updatedAt: null, format: STORAGE_FORMAT_VERSION }

  let index = 0
  for (; index < lines.length; index++) {
    const line = lines[index]
    if (!line.startsWith('#')) break
    const header = HEADER_RE.exec(line)
    if (header) {
      meta.file = header[1].trim()
      continue
    }
    const schema = SCHEMA_RE.exec(line)
    if (schema) {
      meta.schema = Number(schema[1])
      continue
    }
    const updated = UPDATED_RE.exec(line)
    if (updated) {
      meta.updatedAt = updated[1].trim()
    }
  }

  const body = lines.slice(index).join('\n').trim()
  if (!body) return { ...meta, data: null }

  try {
    return { ...meta, data: JSON.parse(body) }
  } catch {
    return { ...meta, data: null, invalid: true }
  }
}

/**
 * Formato NDJSON (uma linha por operação) usado pelo journal `historico.txt`.
 */
export function serializeNdjson(file, schema, rows, updatedAt = new Date().toISOString()) {
  const header = [
    `# finance-app/${file}`,
    `# schema: ${schema}`,
    `# updatedAt: ${updatedAt}`,
    `# format: ${STORAGE_FORMAT_VERSION}`,
    `# lines: ${rows.length}`,
  ].join('\n')

  const body = rows.map((row) => JSON.stringify(row)).join('\n')
  return body ? `${header}\n${body}\n` : `${header}\n`
}

export function parseNdjson(raw) {
  if (!raw || !String(raw).trim()) return { file: null, schema: 1, updatedAt: null, rows: [] }

  const lines = String(raw).split('\n')
  const meta = { file: null, schema: 1, updatedAt: null, rows: [] }

  for (const line of lines) {
    if (!line.startsWith('#')) break
    const header = HEADER_RE.exec(line)
    if (header) {
      meta.file = header[1].trim()
      continue
    }
    const schema = SCHEMA_RE.exec(line)
    if (schema) {
      meta.schema = Number(schema[1])
      continue
    }
    const updated = UPDATED_RE.exec(line)
    if (updated) {
      meta.updatedAt = updated[1].trim()
    }
  }

  const rows = []
  for (const line of lines) {
    if (!line.trim() || line.startsWith('#')) continue
    try {
      rows.push(JSON.parse(line))
    } catch {
      /* linha corrompida: ignora e segue */
    }
  }

  meta.rows = rows
  return meta
}

/**
 * Bundle único de backup com todos os datasets.
 */
const BUNDLE_SECTION = /^===\s*DATASET:\s*([\w-]+)\s*\(([^)]+)\)\s*===$/

export function serializeBundle(datasets, createdAt = new Date().toISOString()) {
  const header = [
    '# finance-app/bundle',
    `# createdAt: ${createdAt}`,
    `# format: ${STORAGE_FORMAT_VERSION}`,
    `# datasets: ${datasets.map((d) => d.key).join(', ')}`,
  ].join('\n')

  const body = datasets
    .map((d) => `=== DATASET: ${d.key} (${d.file}) ===\n${JSON.stringify(d.data, null, 2)}`)
    .join('\n\n')

  return `${header}\n\n${body}\n`
}

export function parseBundle(raw) {
  const text = String(raw || '')
  if (!text.trim()) return { datasets: [], createdAt: null }

  let createdAt = null
  for (const line of text.split('\n')) {
    if (!line.startsWith('#')) break
    const match = /^#\s*createdAt:\s*(.+)$/.exec(line)
    if (match) createdAt = match[1].trim()
  }

  const datasets = []
  let current = null

  for (const line of text.split('\n')) {
    const section = BUNDLE_SECTION.exec(line.trim())
    if (section) {
      current = { key: section[1], file: section[2].trim(), chunks: [] }
      datasets.push(current)
      continue
    }
    if (current) current.chunks.push(line)
  }

  return {
    createdAt,
    datasets: datasets.map((d) => {
      const body = d.chunks.join('\n').trim()
      let data = null
      try {
        data = body ? JSON.parse(body) : null
      } catch {
        data = null
      }
      return { key: d.key, file: d.file, data }
    }),
  }
}
