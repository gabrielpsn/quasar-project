const LOCALE = 'pt-BR'
const TIMEZONE = 'America/Sao_Paulo'

const brlFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const brlCompactFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function brl(value) {
  return brlFormatter.format(toNumber(value))
}

export function brlCompact(value) {
  return brlCompactFormatter.format(toNumber(value))
}

export function numero(value, casas = 2) {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(toNumber(value))
}

export function percentual(value, casas = 1) {
  return `${numero(Number(value || 0) * 100, casas)}%`
}

export function dataBR(iso, opts = {}) {
  if (!iso) return '—'
  const d = iso instanceof Date ? iso : new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...opts,
  })
}

export function dataHoraBR(iso) {
  if (!iso) return '—'
  const d = iso instanceof Date ? iso : new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE,
  })
}

export function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (value === null || value === undefined || value === '') return 0
  const n = Number(String(value).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/**
 * Arredonda para centavos evitando erros de ponto flutuante.
 */
export function cents(value) {
  return Math.round(toNumber(value) * 100) / 100
}

/**
 * Divide um valor em parcelas sem perder centavos.
 * A última parcela absorve a diferença (método do resto).
 */
export function splitInstallments(total, count) {
  const n = Math.max(1, Math.floor(count || 1))
  const base = Math.floor((cents(total) * 100) / n) / 100
  const parcelas = new Array(n).fill(base)
  const totalBase = cents(base * n)
  const diff = cents(cents(total) - totalBase)
  parcelas[n - 1] = cents(base + diff)
  return parcelas
}

export function formatBytes(bytes) {
  const b = Number(bytes || 0)
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(2)} MB`
}
