import { cents } from 'src/utils/format'
import { totalEntradas, totalPago } from './cashflow'

/**
 * Agregações para os relatórios e gráficos.
 * Funções puras, sem dependência de Vue/Pinia.
 */

export function totalDespesas(mes) {
  if (!mes?.itens?.length) return 0
  return cents(mes.itens.reduce((acc, item) => acc + (Number(item.valor) || 0), 0))
}

export function serieMensal(meses, limite = 12) {
  const recorte = (meses || []).slice(-limite)
  return recorte.map((mes) => {
    const renda = totalEntradas(mes)
    const despesas = totalDespesas(mes)
    return {
      id: mes.id,
      rotulo: mes.rotulo,
      renda,
      despesas,
      pago: totalPago(mes),
      sobra: cents(renda - despesas),
    }
  })
}

export function despesasPorCategoria(meses) {
  const mapa = new Map()
  ;(meses || []).forEach((mes) => {
    ;(mes.itens || []).forEach((item) => {
      const chave = item.categoria || 'Sem categoria'
      mapa.set(chave, cents((mapa.get(chave) || 0) + (Number(item.valor) || 0)))
    })
  })
  return [...mapa.entries()]
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total)
}

export function mediaDespesas(meses, janela = 3) {
  const despesas = (meses || [])
    .map((mes) => totalDespesas(mes))
    .filter((total) => total > 0)
  const ultimas = despesas.slice(-janela)
  if (!ultimas.length) return 0
  return ultimas.reduce((acc, total) => acc + total, 0) / ultimas.length
}

export function dividasAtivas(debts) {
  return (debts || [])
    .filter((d) => !d.quitada && (Number(d.saldo) || 0) > 0)
    .map((d) => ({ nome: d.nome || d.credor || 'Dívida', saldo: cents(Number(d.saldo) || 0) }))
    .sort((a, b) => b.saldo - a.saldo)
}

export function composicaoPorTipo(itens, campoValor = 'valor') {
  const mapa = new Map()
  ;(itens || []).forEach((item) => {
    const chave = item.tipo || 'Outros'
    mapa.set(chave, cents((mapa.get(chave) || 0) + (Number(item[campoValor]) || 0)))
  })
  return [...mapa.entries()]
    .map(([tipo, valor]) => ({ tipo, valor }))
    .sort((a, b) => b.valor - a.valor)
}
