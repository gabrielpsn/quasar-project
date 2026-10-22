import { DATASETS } from './datasets'
import { monthKeyFromName, monthLabel } from 'src/utils/dates'
import { shortId } from 'src/utils/uuid'
import { cents } from 'src/utils/format'

/**
 * Migrações de schema por dataset.
 *
 * A chave é a versão de destino. Cada função recebe o payload na versão
 * anterior e devolve o payload na versão de destino.
 */
export const MIGRATIONS = {
  plan: {
    2: (data) => migratePlanToV2(data),
  },
}

/**
 * v1 -> v2
 *
 * v1: { meses: { "Outubro 2026": { entradas: {10: 2500}, itens: [{desc, valor, categoria, vencimento}] } } }
 * v2: { meses: [ { id, rotulo, entradas: [{id, dia, valor, desc}], itens: [{id, ...}] } ] }
 */
function migratePlanToV2(data) {
  if (!data || typeof data !== 'object') return { meses: [] }

  const source = data.meses
  if (Array.isArray(source)) {
    return { meses: source.map(normalizeMonthV2) }
  }
  if (!source || typeof source !== 'object') return { meses: [] }

  const meses = Object.entries(source).map(([label, month]) => {
    const normalized = normalizeMonthV2({ ...month, rotulo: label })
    const { rotulo } = normalized
    normalized.id = monthKeyFromLabel(rotulo)
    normalized.rotulo = rotulo
    return normalized
  })

  return { ...data, meses }
}

function monthKeyFromLabel(label) {
  const partes = String(label || '').trim().split(' ')
  const nome = partes.slice(0, -1).join(' ')
  const ano = Number(partes[partes.length - 1])
  return monthKeyFromName(nome, Number.isFinite(ano) ? ano : new Date().getFullYear())
}

function normalizeMonthV2(month) {
  const rotulo = month.rotulo || month.label || ''
  const id = month.id || monthKeyFromLabel(rotulo)

  const entradas = []
  const rawEntradas = month.entradas || {}
  if (Array.isArray(rawEntradas)) {
    rawEntradas.forEach((e) => {
      entradas.push({
        id: e.id || shortId('e'),
        dia: Number(e.dia) || 10,
        valor: cents(e.valor || 0),
        desc: e.desc || 'Recebimento',
      })
    })
  } else {
    Object.entries(rawEntradas).forEach(([dia, valor]) => {
      entradas.push({
        id: shortId('e'),
        dia: Number(dia),
        valor: cents(valor || 0),
        desc: 'Recebimento',
      })
    })
  }

  const itens = (month.itens || []).map((item) => ({
    id: item.id || shortId('i'),
    desc: item.desc || '',
    valor: cents(item.valor || 0),
    categoria: item.categoria || 'Fixo',
    vencimentoDia: Number(item.vencimento ?? item.vencimentoDia) || 10,
    mesRef: item.mesRef || id,
    origem: item.origem || { tipo: 'manual' },
    parcelas: item.parcelas || null,
    cartaoId: item.cartaoId || null,
    dividaId: item.dividaId || null,
    pago: !!item.pago,
    dataPagamento: item.dataPagamento || null,
    valorPago: item.valorPago === null || item.valorPago === undefined ? null : cents(item.valorPago),
  }))

  return {
    id,
    rotulo: rotulo || monthLabel(id),
    entradas,
    itens,
  }
}

/**
 * Executa as migrações necessárias para levar `data` da versão `fromSchema`
 * até a versão atual declarada em `DATASETS`.
 */
export function migrate(datasetKey, data, fromSchema) {
  const target = DATASETS[datasetKey]?.schema ?? 1
  let version = Number(fromSchema) || 1
  let current = data

  while (version < target) {
    const step = MIGRATIONS[datasetKey]?.[version + 1]
    if (!step) {
      version = target
      break
    }
    current = step(current)
    version++
  }

  return { data: current, schema: version }
}
