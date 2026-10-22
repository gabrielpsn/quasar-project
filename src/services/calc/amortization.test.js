import { describe, expect, it } from 'vitest'
import {
  compararEstrategias,
  compararTresEstrategias,
  cronogramaPrice,
  cronogramaSac,
  pagarVsInvestir,
  parcelaPrice,
  parcelaSac,
  taxaMensalDeAnual,
} from './amortization'

const round = (v) => Math.round(v * 100) / 100

describe('parcelaPrice', () => {
  it('sem juros divide em partes iguais', () => {
    expect(parcelaPrice(1200, 0, 12)).toBe(100)
  })

  it('confere a parcela de um financiamento clássico', () => {
    const p = parcelaPrice(10000, 0.02, 12)
    expect(round(p)).toBeCloseTo(945.6, 1)
  })

  it('quita o saldo ao final do cronograma', () => {
    const { linhas, totalJuros } = cronogramaPrice({ saldo: 10000, taxaMensal: 0.02, parcelas: 12 })
    expect(linhas).toHaveLength(12)
    expect(linhas[linhas.length - 1].saldo).toBeLessThanOrEqual(0.005)
    expect(totalJuros).toBeGreaterThan(0)
  })
})

describe('parcelaSac', () => {
  it('primeira parcela inclui juros sobre o saldo total', () => {
    expect(round(parcelaSac(12000, 0.01, 12))).toBe(1120)
  })

  it('cronograma SAC tem parcelas decrescentes e zera o saldo', () => {
    const { linhas, totalJuros } = cronogramaSac({ saldo: 12000, taxaMensal: 0.01, parcelas: 12 })
    expect(linhas).toHaveLength(12)
    expect(linhas[0].parcela).toBeGreaterThan(linhas[linhas.length - 1].parcela)
    expect(linhas[linhas.length - 1].saldo).toBeLessThanOrEqual(0.005)
    expect(totalJuros).toBeGreaterThan(0)
  })

  it('SAC cobra menos juros que Price no mesmo prazo', () => {
    const price = cronogramaPrice({ saldo: 20000, taxaMensal: 0.015, parcelas: 24 })
    const sac = cronogramaSac({ saldo: 20000, taxaMensal: 0.015, parcelas: 24 })
    expect(sac.totalJuros).toBeLessThan(price.totalJuros)
  })
})

describe('compararEstrategias', () => {
  const dividas = [
    { id: 'a', descricao: 'Cartão', saldo: 5000, taxaJuros: 12, parcelas: 10 },
    { id: 'b', descricao: 'Empréstimo', saldo: 1500, taxaJuros: 2, parcelas: 6 },
  ]

  it('quita todas as dívidas', () => {
    const r = compararEstrategias({ dividas, aporteExtra: 500, estrategia: 'avalanche' })
    expect(r.concluido).toBe(true)
    expect(r.meses).toBeGreaterThan(0)
    expect(r.ordem).toHaveLength(2)
  })

  it('aporte extra reduz o tempo até zerar', () => {
    const semExtra = compararEstrategias({ dividas, aporteExtra: 0 })
    const comExtra = compararEstrategias({ dividas, aporteExtra: 2000 })
    expect(comExtra.meses).toBeLessThan(semExtra.meses)
  })

  it('avalanche prioriza a maior taxa', () => {
    const r = compararEstrategias({ dividas, aporteExtra: 3000, estrategia: 'avalanche' })
    expect(r.ordem[0].id).toBe('a')
  })

  it('bola de neve prioriza o menor saldo', () => {
    const r = compararEstrategias({ dividas, aporteExtra: 3000, estrategia: 'bolaDeNeve' })
    expect(r.ordem[0].id).toBe('b')
  })

  it('sem dívidas retorna resultado vazio', () => {
    const r = compararEstrategias({ dividas: [] })
    expect(r.meses).toBe(0)
    expect(r.totalJuros).toBe(0)
  })

  it('compara as três estratégias com economia de juros', () => {
    const r = compararTresEstrategias({ dividas, aporteExtra: 500 })
    expect(r).toHaveLength(3)
    r.forEach((e) => {
      expect(e.economiaJuros).toBeGreaterThanOrEqual(0)
      expect(e.mesesEconomizados).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('pagarVsInvestir', () => {
  it('dívida caríssima recomenda amortizar', () => {
    const r = pagarVsInvestir({ saldo: 10000, taxaDividaMensal: 0.12, dyAnualPercentual: 8, aporteMensal: 1000, meses: 12 })
    expect(r.recomendacao).toBe('amortizar')
  })

  it('dívida barata com DY alto recomenda investir', () => {
    const r = pagarVsInvestir({ saldo: 1000, taxaDividaMensal: 0.001, dyAnualPercentual: 12, aporteMensal: 2000, meses: 24 })
    expect(r.recomendacao).toBe('investir')
    expect(r.montante).toBeGreaterThan(0)
  })
})

describe('taxaMensalDeAnual', () => {
  it('converte taxa anual composta para mensal', () => {
    expect(round(taxaMensalDeAnual(12.6825) * 100)).toBeCloseTo(1, 1)
  })

  it('taxa zero permanece zero', () => {
    expect(taxaMensalDeAnual(0)).toBe(0)
  })
})
