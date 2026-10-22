import { MESES_PT } from 'src/utils/dates'
import { cents } from 'src/utils/format'
import { shortId } from 'src/utils/uuid'
import { CARTOES_PADRAO } from 'src/services/seed/defaultData'

const MESES_NORMALIZADOS = MESES_PT.map((m) =>
  m.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
)

function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Converte "Outubro 2026", "out de 2026" ou "2026-10" em "2026-10".
 */
export function parseLegacyMonth(label) {
  const texto = String(label || '').trim()
  if (/^\d{4}-\d{2}$/.test(texto)) return texto

  const match = /^([A-Za-zÀ-ÿ.]+)\s*(?:de\s*)?[/\s-]*\s*(\d{4})$/.exec(texto)
  if (!match) return null

  const nome = normalizar(match[1]).slice(0, 3)
  const indice = MESES_NORMALIZADOS.findIndex((m) => m.startsWith(nome))
  if (indice < 0) return null

  return `${match[2]}-${String(indice + 1).padStart(2, '0')}`
}

function cartaoIdPorDescricao(desc) {
  const match = /^\[Cartão ([^\]]+)\]/.exec(desc || '')
  if (!match) return null
  const nome = match[1].trim().toLowerCase()
  const cartao = CARTOES_PADRAO.find(
    (c) => c.nome.toLowerCase() === nome || nome.includes(c.nome.toLowerCase())
  )
  return cartao ? cartao.id : null
}

function legadoPago(flags, tipo, mesLabel, indice) {
  return flags?.[`v22_${tipo}_${mesLabel}_${indice}`] === 'true'
}

function legadoData(flags, tipo, mesLabel, indice) {
  const valor = flags?.[`v22_date_${tipo}_${mesLabel}_${indice}`]
  return typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : null
}

function converterEntradas(entradas) {
  if (!entradas) return []
  if (Array.isArray(entradas)) {
    return entradas
      .map((e) => ({
        id: shortId('e'),
        dia: Number(e.dia ?? e.vencimento ?? 10) || 10,
        valor: cents(e.valor || 0),
        desc: e.desc || e.descricao || 'Recebimento',
      }))
      .filter((e) => e.valor > 0)
  }
  return Object.entries(entradas)
    .map(([dia, valor]) => ({
      id: shortId('e'),
      dia: Number(dia) || 10,
      valor: cents(valor || 0),
      desc: 'Recebimento',
    }))
    .filter((e) => e.valor > 0)
}

function converterItem(item, mesLabel, indice, flags) {
  const pago = legadoPago(flags, 'item', mesLabel, indice)
  const dataPagamento = pago ? legadoData(flags, 'item', mesLabel, indice) : null
  const desc = String(item.desc ?? item.descricao ?? '').trim() || 'Lançamento'
  const categoria = item.categoria || 'Fixo'

  return {
    id: shortId('i'),
    desc,
    valor: cents(item.valor || 0),
    categoria,
    vencimentoDia: Number(item.vencimento ?? item.vencimentoDia ?? 10) || 10,
    mesRef: null,
    origem: { tipo: 'importacao', fonte: 'gemini-v22' },
    parcelas: null,
    cartaoId: categoria === 'Cartão' ? cartaoIdPorDescricao(desc) : null,
    dividaId: null,
    pago,
    dataPagamento,
    valorPago: pago ? cents(item.valor || 0) : null,
  }
}

function converterInvestimento(inv, indice) {
  const ticker = String(inv.ticker ?? inv.nome ?? '').trim()
  const cotas = Number(inv.cotas ?? 0) || 0
  const preco = Number(inv.preco ?? inv.precoMedio ?? inv.precoAtual ?? 0) || 0
  const segmento = String(inv.tipo ?? inv.descricao ?? '').trim() || 'Fundo imobiliário'
  const ehFii = /11$/.test(ticker) || /fii|imobili/i.test(segmento)

  return {
    id: shortId('inv'),
    nome: ticker || `Ativo ${indice + 1}`,
    ticker: ticker || null,
    tipo: ehFii ? 'FII' : 'Ação',
    descricao: segmento,
    cotas,
    precoMedio: preco,
    precoAtual: preco,
    valorAplicado: cents(cotas * preco),
    valorAtual: cents(cotas * preco),
    dy: 0,
    dataAquisicao: null,
    criadoEm: new Date().toISOString(),
    origem: { tipo: 'importacao', fonte: 'gemini-v22' },
  }
}

/**
 * Converte o banco do Gemini v22 (`fin_db_v22`, `inv_db_v22` e flags `v22_*`)
 * para o modelo local do app (meses + carteira).
 *
 * Função pura: recebe o conteúdo bruto e devolve `{ plan, investments, ... }`.
 */
export function convertGeminiV22({ finDb, invDb = [], flags = {} } = {}) {
  const warnings = []
  const summary = { meses: 0, entradas: 0, itens: 0, pagos: 0, investimentos: 0 }

  if (!finDb || typeof finDb !== 'object' || Array.isArray(finDb)) {
    return {
      plan: { meses: [] },
      investments: [],
      warnings: ['Nenhum dado de fluxo de caixa encontrado (fin_db_v22).'],
      summary,
    }
  }

  const entradas = Object.entries(finDb)
    .map(([label, dados]) => {
      const id = parseLegacyMonth(label)
      if (!id) warnings.push(`Mês ignorado (nome não reconhecido): "${label}".`)
      return { label, id, dados }
    })
    .filter((m) => m.id && m.dados && typeof m.dados === 'object')
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

  const meses = entradas.map(({ label, id, dados }) => {
    const itens = (Array.isArray(dados.itens) ? dados.itens : []).map((item, indice) => {
      const convertido = converterItem(item, label, indice, flags)
      if (!convertido.valor) warnings.push(`"${convertido.desc}" em ${label} está sem valor.`)
      return convertido
    })

    const mes = {
      id,
      rotulo: label.trim(),
      entradas: converterEntradas(dados.entradas),
      itens,
    }

    summary.meses += 1
    summary.itens += mes.itens.length
    summary.entradas += mes.entradas.length
    summary.pagos += mes.itens.filter((i) => i.pago).length
    return mes
  })

  // Pagamentos de pendências herdadas: no Gemini o item continua no mês de
  // origem, mas era quitado na aba do mês seguinte (flag v22_carry_*).
  for (let k = 1; k < meses.length; k += 1) {
    const atual = entradas[k]
    const anterior = meses[k - 1]
    const pendentes = anterior.itens.filter((i) => !i.pago)
    pendentes.forEach((item, indice) => {
      if (!legadoPago(flags, 'carry', atual.label, indice)) return
      item.pago = true
      item.dataPagamento =
        legadoData(flags, 'carry', atual.label, indice) || item.dataPagamento || null
      item.valorPago = item.pago ? item.valor : null
      summary.pagos += 1
    })
  }

  const investments = (Array.isArray(invDb) ? invDb : []).map((inv, indice) => {
    const convertido = converterInvestimento(inv, indice)
    if (!convertido.cotas || !convertido.precoMedio) {
      warnings.push(`Investimento "${convertido.ticker || convertido.nome}" sem cotas ou preço.`)
    }
    summary.investimentos += 1
    return convertido
  })

  return {
    plan: { meses },
    investments,
    warnings,
    summary,
  }
}

/**
 * Aceita três formatos de entrada:
 *  - string com o JSON de `localStorage` (dump completo)
 *  - objeto `{ fin_db_v22, inv_db_v22, ...flags }`
 *  - objeto já contendo apenas os meses (`{ "Outubro 2026": {...} }`)
 */
export function extractLegacyPayload(input) {
  let dados = input

  if (typeof dados === 'string') {
    const texto = dados.trim()
    if (!texto) throw new Error('Cole o conteúdo exportado do aplicativo antigo.')
    try {
      dados = JSON.parse(texto)
    } catch {
      throw new Error('JSON inválido. Use o resultado de JSON.stringify(localStorage) do app antigo.')
    }
  }

  if (!dados || typeof dados !== 'object') {
    throw new Error('Formato não reconhecido. Esperado um objeto JSON.')
  }

  const flags = {}
  for (const [chave, valor] of Object.entries(dados)) {
    if (chave.startsWith('v22_')) flags[chave] = valor
  }

  const parse = (valor) => {
    if (typeof valor !== 'string') return valor
    try {
      return JSON.parse(valor)
    } catch {
      return null
    }
  }

  let finDb = parse(dados.fin_db_v22 ?? dados.finDb ?? dados.fluxo ?? null)
  let invDb = parse(dados.inv_db_v22 ?? dados.invDb ?? dados.investimentos ?? null)

  if (!finDb && Array.isArray(dados)) {
    invDb = invDb || dados
  }

  if (!finDb && !Array.isArray(dados)) {
    const chaves = Object.keys(dados).filter((k) => parseLegacyMonth(k))
    if (chaves.length) {
      finDb = Object.fromEntries(chaves.map((k) => [k, dados[k]]))
    }
  }

  if (!finDb && !invDb) {
    throw new Error('Não encontrei fin_db_v22 nem inv_db_v22 no conteúdo informado.')
  }

  return { finDb: finDb || null, invDb: invDb || [], flags }
}
