export const MESES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export const DIAS_VENCIMENTO = [1, 10, 15, 30]

export function monthKey(date) {
  const d = date instanceof Date ? date : new Date(date)
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  return `${d.getFullYear()}-${mes}`
}

export function monthKeyFromParts(ano, mes) {
  return `${ano}-${String(mes).padStart(2, '0')}`
}

export function parseMonthKey(key) {
  const [ano, mes] = String(key).split('-')
  return { ano: Number(ano), mes: Number(mes) }
}

export function monthLabel(key) {
  const { ano, mes } = parseMonthKey(key)
  if (!ano || !mes) return key
  return `${MESES_PT[mes - 1]} ${ano}`
}

export function monthLabelFromName(nome, ano) {
  const idx = MESES_PT.indexOf(nome)
  if (idx < 0) return `${nome} ${ano}`
  return `${MESES_PT[idx]} ${ano}`
}

export function monthKeyFromName(nome, ano) {
  const idx = MESES_PT.indexOf(nome)
  if (idx < 0) return monthKeyFromParts(ano, 1)
  return monthKeyFromParts(ano, idx + 1)
}

export function addMonths(key, amount) {
  const { ano, mes } = parseMonthKey(key)
  const total = ano * 12 + (mes - 1) + amount
  const novoAno = Math.floor(total / 12)
  const novoMes = (total % 12) + 1
  return monthKeyFromParts(novoAno, novoMes)
}

export function diffMonths(fromKey, toKey) {
  const a = parseMonthKey(fromKey)
  const b = parseMonthKey(toKey)
  return (b.ano * 12 + b.mes) - (a.ano * 12 + a.mes)
}

export function currentMonthKey() {
  return monthKey(new Date())
}

export function monthDays(key) {
  const { ano, mes } = parseMonthKey(key)
  return new Date(ano, mes, 0).getDate()
}

export function todayISO() {
  const d = new Date()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

export function nowISO() {
  return new Date().toISOString()
}
