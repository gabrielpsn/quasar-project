export const MAX_MESES = 600

export function taxaMensalDeAnual(taxaAnualPercentual) {
  const anual = Number(taxaAnualPercentual) || 0
  if (anual <= 0) return 0
  return Math.pow(1 + anual / 100, 1 / 12) - 1
}

export function parcelaPrice(saldo, taxaMensal, parcelas) {
  const principal = Number(saldo) || 0
  const n = Math.max(1, Math.floor(Number(parcelas) || 1))
  const i = Math.max(0, Number(taxaMensal) || 0)
  if (principal <= 0) return 0
  if (i === 0) return principal / n
  return (principal * i) / (1 - Math.pow(1 + i, -n))
}

export function parcelaSac(saldo, taxaMensal, parcelas) {
  const principal = Number(saldo) || 0
  const n = Math.max(1, Math.floor(Number(parcelas) || 1))
  const i = Math.max(0, Number(taxaMensal) || 0)
  if (principal <= 0) return 0
  return principal / n + principal * i
}

export function cronogramaPrice({ saldo, taxaMensal, parcelas }) {
  const i = Math.max(0, Number(taxaMensal) || 0)
  const n = Math.max(1, Math.floor(Number(parcelas) || 1))
  let restante = Number(saldo) || 0
  const parcela = parcelaPrice(restante, i, n)
  const linhas = []
  for (let mes = 1; mes <= n && restante > 0.005; mes += 1) {
    const juros = restante * i
    const amortizacao = Math.min(restante, parcela - juros)
    restante = Math.max(0, restante - amortizacao)
    linhas.push({ mes, juros, amortizacao, parcela: juros + amortizacao, saldo: restante })
  }
  return { parcela, linhas, totalJuros: linhas.reduce((a, l) => a + l.juros, 0) }
}

export function cronogramaSac({ saldo, taxaMensal, parcelas }) {
  const i = Math.max(0, Number(taxaMensal) || 0)
  const n = Math.max(1, Math.floor(Number(parcelas) || 1))
  const principal = Number(saldo) || 0
  const amortizacao = principal / n
  let restante = principal
  const linhas = []
  for (let mes = 1; mes <= n && restante > 0.005; mes += 1) {
    const juros = restante * i
    const amort = Math.min(restante, amortizacao)
    restante = Math.max(0, restante - amort)
    linhas.push({ mes, juros, amortizacao: amort, parcela: juros + amort, saldo: restante })
  }
  return {
    parcelaInicial: linhas.length ? linhas[0].parcela : 0,
    parcelaFinal: linhas.length ? linhas[linhas.length - 1].parcela : 0,
    linhas,
    totalJuros: linhas.reduce((a, l) => a + l.juros, 0),
  }
}

/**
 * Simula a quitação de uma carteira de dívidas mês a mês.
 * Cada dívida paga sua parcela mínima; o excedente (aporte extra) é
 * direcionado à dívida prioritária conforme a estratégia.
 */
export function compararEstrategias({
  dividas = [],
  aporteExtra = 0,
  estrategia = 'avalanche',
  maxMeses = MAX_MESES,
} = {}) {
  const carteira = dividas
    .filter((d) => !d.quitada && Number(d.saldo) > 0)
    .map((d) => ({
      id: d.id,
      descricao: d.descricao || d.nome || 'Dívida',
      saldo: Number(d.saldo) || 0,
      taxa: Math.max(0, Number(d.taxaJuros || 0) / 100),
      parcela: Math.max(
        0,
        Number(d.parcela) || parcelaPrice(d.saldo, Number(d.taxaJuros || 0) / 100, d.parcelas || 1)
      ),
    }))

  if (!carteira.length) {
    return { meses: 0, totalJuros: 0, totalPago: 0, ordem: [], cronograma: [] }
  }

  const prioridade = {
    avalanche: (a, b) => b.taxa - a.taxa,
    bolaDeNeve: (a, b) => a.saldo - b.saldo,
    menorTaxa: (a, b) => a.taxa - b.taxa,
  }[estrategia] || ((a, b) => b.taxa - a.taxa)

  const cronograma = []
  const ordem = []
  let totalJuros = 0
  let totalPago = 0
  let mes = 0
  let ativas = carteira.map((d) => ({ ...d }))

  while (ativas.some((d) => d.saldo > 0.005) && mes < maxMeses) {
    mes += 1
    let excedente = Math.max(0, Number(aporteExtra) || 0)

    for (const d of ativas) {
      if (d.saldo <= 0.005) continue
      const juros = d.saldo * d.taxa
      totalJuros += juros
      d.saldo += juros
      const pagamento = Math.min(d.saldo, d.parcela)
      d.saldo -= pagamento
      totalPago += pagamento
    }

    const abertas = ativas.filter((d) => d.saldo > 0.005).sort(prioridade)
    for (const d of abertas) {
      if (excedente <= 0) break
      const pagamento = Math.min(d.saldo, excedente)
      d.saldo -= pagamento
      excedente -= pagamento
      totalPago += pagamento
    }

    for (const d of ativas) {
      if (d.saldo <= 0.005 && !ordem.some((o) => o.id === d.id)) {
        ordem.push({ id: d.id, descricao: d.descricao, mes })
      }
    }

    cronograma.push({
      mes,
      totalDevido: ativas.reduce((a, d) => a + Math.max(0, d.saldo), 0),
    })
  }

  return {
    meses: mes,
    totalJuros,
    totalPago,
    ordem,
    cronograma,
    concluido: ativas.every((d) => d.saldo <= 0.005),
  }
}

export function compararTresEstrategias({ dividas = [], aporteExtra = 0 } = {}) {
  const base = compararEstrategias({ dividas, aporteExtra: 0, estrategia: 'avalanche' })
  const avalanche = compararEstrategias({ dividas, aporteExtra, estrategia: 'avalanche' })
  const bolaDeNeve = compararEstrategias({ dividas, aporteExtra, estrategia: 'bolaDeNeve' })
  const menorTaxa = compararEstrategias({ dividas, aporteExtra, estrategia: 'menorTaxa' })

  return [avalanche, bolaDeNeve, menorTaxa].map((r) => ({
    ...r,
    economiaJuros: Math.max(0, base.totalJuros - r.totalJuros),
    mesesEconomizados: Math.max(0, base.meses - r.meses),
  }))
}

/**
 * Compara amortizar a dívida com investir o mesmo aporte.
 * Retorna o custo dos juros no período vs. o rendimento do aporte.
 */
export function pagarVsInvestir({
  saldo = 0,
  taxaDividaMensal = 0,
  dyAnualPercentual = 8,
  aporteMensal = 0,
  meses = 12,
} = {}) {
  const prazo = Math.max(1, Math.floor(Number(meses) || 12))
  const i = Math.max(0, Number(taxaDividaMensal) || 0)
  const custoJuros = (Number(saldo) || 0) * i * prazo

  const taxaInvest = taxaMensalDeAnual(dyAnualPercentual)
  let montante = 0
  for (let m = 0; m < prazo; m += 1) {
    montante = montante * (1 + taxaInvest) + (Number(aporteMensal) || 0)
  }
  const rendimento = montante - (Number(aporteMensal) || 0) * prazo

  return {
    custoJuros,
    rendimento,
    montante,
    vantagem: rendimento - custoJuros,
    recomendacao: rendimento > custoJuros ? 'investir' : 'amortizar',
  }
}
