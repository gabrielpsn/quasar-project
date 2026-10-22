import { cents } from 'src/utils/format'
import { DIAS_VENCIMENTO } from 'src/utils/dates'

/**
 * Cálculos do fluxo de caixa.
 * Funções puras — sem Vue, sem Pinia — para garantir testabilidade.
 */

export function totalEntradas(mes) {
  if (!mes?.entradas?.length) return 0
  return cents(mes.entradas.reduce((acc, e) => acc + (Number(e.valor) || 0), 0))
}

export function itensPendentes(mes) {
  if (!mes?.itens?.length) return []
  return mes.itens.filter((i) => !i.pago)
}

export function totalPendente(mes) {
  return cents(itensPendentes(mes).reduce((acc, i) => acc + (Number(i.valor) || 0), 0))
}

export function totalPago(mes) {
  if (!mes?.itens?.length) return 0
  return cents(
    mes.itens
      .filter((i) => i.pago)
      .reduce((acc, i) => acc + (Number(i.valorPago ?? i.valor) || 0), 0)
  )
}

export function totalGeral(mes) {
  if (!mes?.itens?.length) return 0
  return cents(mes.itens.reduce((acc, i) => acc + (Number(i.valor) || 0), 0))
}

/**
 * Saldo devedor: total a pagar menos o que já foi pago.
 */
export function saldoDevedor(mes) {
  return cents(totalGeral(mes) - totalPago(mes))
}

/**
 * Agrupa os itens por dia de vencimento, preservando a ordem dos dias canônicos.
 */
export function itensPorDia(mes) {
  const grupos = new Map(DIAS_VENCIMENTO.map((d) => [d, []]))
  const extras = []

  ;(mes?.itens || []).forEach((item) => {
    const dia = Number(item.vencimentoDia)
    if (grupos.has(dia)) grupos.get(dia).push(item)
    else extras.push(item)
  })

  return [...grupos.entries()].map(([dia, itens]) => ({ dia, itens }))
}

/**
 * Pendências dos meses anteriores que ainda não foram pagas.
 * `meses` deve estar ordenado do mais antigo para o mais recente.
 */
export function pendenciasAnteriores(meses, mesId) {
  const index = meses.findIndex((m) => m.id === mesId)
  if (index <= 0) return []

  const pendentes = []
  for (let i = 0; i < index; i++) {
    const anterior = meses[i]
    itensPendentes(anterior).forEach((item) => {
      pendentes.push({
        ...item,
        id: item.id,
        mesOrigem: anterior.id,
        rotuloOrigem: anterior.rotulo,
        pendenteDe: true,
      })
    })
  }
  return pendentes
}

/**
 * Saldo de um dia: entrada recebida menos tudo que vence naquele dia.
 */
export function saldoDoDia(mes, dia, pendencias = []) {
  const entrada = cents(
    (mes?.entradas || []).filter((e) => Number(e.dia) === Number(dia)).reduce((a, e) => a + (Number(e.valor) || 0), 0)
  )
  const aPagar = cents(
    (mes?.itens || [])
      .filter((i) => Number(i.vencimentoDia) === Number(dia) && !i.pago)
      .reduce((a, i) => a + (Number(i.valor) || 0), 0)
  )
  const pendentesDia = cents(
    pendencias.filter((i) => Number(i.vencimentoDia) === Number(dia)).reduce((a, i) => a + (Number(i.valor) || 0), 0)
  )

  return {
    dia,
    entrada,
    aPagar: cents(aPagar + pendentesDia),
    saldo: cents(entrada - aPagar - pendentesDia),
  }
}

export function classificarSaldo(saldo) {
  if (saldo < 0) return 'deficit'
  if (saldo === 0) return 'zerado'
  return 'ok'
}

/**
 * Resumo completo do mês considerando as pendências herdadas.
 */
export function resumoMes(mes, pendencias = []) {
  const renda = totalEntradas(mes)
  const totalItens = totalGeral(mes)
  const totalPendenteItens = totalPendente(mes)
  const totalPendenteGeral = cents(totalPendenteItens + pendencias.reduce((a, i) => a + (Number(i.valor) || 0), 0))
  const pago = totalPago(mes)

  return {
    renda,
    totalItens,
    pago,
    pendente: totalPendenteGeral,
    pendenteDoMes: totalPendenteItens,
    pendenteAnterior: cents(totalPendenteGeral - totalPendenteItens),
    saldoDevedor: cents(totalItens + pendencias.reduce((a, i) => a + (Number(i.valor) || 0), 0) - pago),
    sobra: cents(renda - totalPendenteGeral),
    porDia: DIAS_VENCIMENTO.map((dia) => saldoDoDia(mes, dia, pendencias)),
  }
}

/**
 * Categorias com total gasto no mês.
 */
export function totaisPorCategoria(mes, tipo = 'saida') {
  const mapa = new Map()
  ;(mes?.itens || []).forEach((item) => {
    if (item.pago && tipo === 'pago') return
    const chave = item.categoria || 'Sem categoria'
    mapa.set(chave, cents((mapa.get(chave) || 0) + (Number(item.valor) || 0)))
  })
  return [...mapa.entries()].map(([categoria, total]) => ({ categoria, total })).sort((a, b) => b.total - a.total)
}

/**
 * Total por dia de vencimento (para gráficos).
 */
export function seriePorDia(mes) {
  return DIAS_VENCIMENTO.map((dia) => {
    const entrada = cents(
      (mes?.entradas || []).filter((e) => Number(e.dia) === dia).reduce((a, e) => a + (Number(e.valor) || 0), 0)
    )
    const saida = cents(
      (mes?.itens || []).filter((i) => Number(i.vencimentoDia) === dia).reduce((a, i) => a + (Number(i.valor) || 0), 0)
    )
    return { dia, entrada, saida, saldo: cents(entrada - saida) }
  })
}
