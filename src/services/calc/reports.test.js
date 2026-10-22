import { describe, it, expect } from 'vitest'
import {
  totalDespesas,
  serieMensal,
  despesasPorCategoria,
  mediaDespesas,
  dividasAtivas,
  composicaoPorTipo,
} from './reports'

const mes = (id, entradas, itens) => ({
  id,
  rotulo: id,
  entradas: entradas.map((valor) => ({ valor })),
  itens,
})

describe('totalDespesas', () => {
  it('soma os itens do mês', () => {
    expect(totalDespesas(mes('a', [], [{ valor: 100 }, { valor: 50.25 }]))).toBe(150.25)
  })
  it('retorna 0 sem itens', () => {
    expect(totalDespesas(null)).toBe(0)
  })
})

describe('serieMensal', () => {
  const meses = [
    mes('jan', [1000], [{ valor: 400, pago: true }]),
    mes('fev', [2000], [{ valor: 500, pago: false }]),
    mes('mar', [1500], [{ valor: 1600, pago: false }]),
  ]

  it('calcula renda, despesas e sobra', () => {
    const [fev] = serieMensal([meses[1]])
    expect(fev.renda).toBe(2000)
    expect(fev.despesas).toBe(500)
    expect(fev.sobra).toBe(1500)
    expect(fev.pago).toBe(0)
  })

  it('destaca sobra negativa', () => {
    const [, , mar] = serieMensal(meses)
    expect(mar.sobra).toBe(-100)
  })

  it('respeita o limite de meses', () => {
    expect(serieMensal(meses, 2).map((m) => m.id)).toEqual(['fev', 'mar'])
  })
})

describe('despesasPorCategoria', () => {
  it('agrupa e ordena por total', () => {
    const meses = [
      mes('a', [], [
        { valor: 100, categoria: 'Fixo' },
        { valor: 300, categoria: 'Cartão' },
      ]),
      mes('b', [], [{ valor: 150, categoria: 'Fixo' }]),
    ]
    expect(despesasPorCategoria(meses)).toEqual([
      { categoria: 'Cartão', total: 300 },
      { categoria: 'Fixo', total: 250 },
    ])
  })

  it('usa "Sem categoria" quando ausente', () => {
    expect(despesasPorCategoria([mes('a', [], [{ valor: 10 }])])[0].categoria).toBe('Sem categoria')
  })
})

describe('mediaDespesas', () => {
  it('usa a média das últimas N competências com gasto', () => {
    const meses = [
      mes('a', [], [{ valor: 1000 }]),
      mes('b', [], [{ valor: 2000 }]),
      mes('c', [], [{ valor: 3000 }]),
      mes('d', [], []),
    ]
    expect(mediaDespesas(meses, 2)).toBe(2500)
  })

  it('retorna 0 sem despesas', () => {
    expect(mediaDespesas([mes('a', [], [])])).toBe(0)
  })
})

describe('dividasAtivas', () => {
  it('ignora quitadas e ordena por saldo', () => {
    const debts = [
      { nome: 'A', saldo: 100 },
      { nome: 'B', saldo: 900 },
      { nome: 'C', saldo: 0, quitada: true },
    ]
    expect(dividasAtivas(debts)).toEqual([
      { nome: 'B', saldo: 900 },
      { nome: 'A', saldo: 100 },
    ])
  })
})

describe('composicaoPorTipo', () => {
  it('agrupa pelo campo de valor informado', () => {
    const itens = [
      { tipo: 'FII', valor: 100 },
      { tipo: 'FII', valor: 50 },
      { tipo: 'Ações', valor: 200 },
    ]
    expect(composicaoPorTipo(itens)).toEqual([
      { tipo: 'Ações', valor: 200 },
      { tipo: 'FII', valor: 150 },
    ])
  })

  it('suporta campo alternativo', () => {
    expect(composicaoPorTipo([{ tipo: 'FII', valorAtual: 42 }], 'valorAtual')[0].valor).toBe(42)
  })
})
