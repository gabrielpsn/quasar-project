import { describe, expect, it } from 'vitest'
import {
  categoriasDisponiveis,
  filtrarItens,
  filtroAtivo,
  filtroVazio,
  resumoFiltro,
} from './filters'

const itens = [
  { id: '1', desc: 'Parcela Carro', valor: 1540, categoria: 'Fixo', pago: true, valorPago: 1540, cartaoId: null },
  { id: '2', desc: 'Conta Luz', valor: 150.5, categoria: 'Variável', pago: false, cartaoId: null },
  { id: '3', desc: '[Cartão Atacadão] Supermercado', valor: 1255.38, categoria: 'Cartão', pago: false, cartaoId: 'card-atacadao' },
  { id: '4', desc: 'Nubank Empréstimo', valor: 460, categoria: 'Empréstimo', pago: true, valorPago: 450, cartaoId: null },
]

describe('filtroAtivo', () => {
  it('falso para filtro vazio', () => {
    expect(filtroAtivo(filtroVazio())).toBe(false)
  })

  it('verdadeiro quando algum campo é preenchido', () => {
    expect(filtroAtivo({ ...filtroVazio(), texto: 'luz' })).toBe(true)
    expect(filtroAtivo({ ...filtroVazio(), status: 'pagos' })).toBe(true)
    expect(filtroAtivo({ ...filtroVazio(), valorMin: 100 })).toBe(true)
  })
})

describe('filtrarItens', () => {
  it('busca por texto ignorando caixa e acentos', () => {
    expect(filtrarItens(itens, { texto: 'CARRO' })).toHaveLength(1)
    expect(filtrarItens(itens, { texto: 'emprestimo' })).toHaveLength(1)
    expect(filtrarItens(itens, { texto: 'atacadao' })).toHaveLength(1)
  })

  it('busca também pela categoria', () => {
    expect(filtrarItens(itens, { texto: 'variavel' })[0].id).toBe('2')
  })

  it('filtra por categoria', () => {
    expect(filtrarItens(itens, { categoria: 'Cartão' })).toHaveLength(1)
  })

  it('filtra por cartão', () => {
    expect(filtrarItens(itens, { cartaoId: 'card-atacadao' })[0].id).toBe('3')
  })

  it('filtra por status', () => {
    expect(filtrarItens(itens, { status: 'pagos' })).toHaveLength(2)
    expect(filtrarItens(itens, { status: 'pendentes' })).toHaveLength(2)
    expect(filtrarItens(itens, { status: 'todos' })).toHaveLength(4)
  })

  it('filtra por faixa de valor', () => {
    expect(filtrarItens(itens, { valorMin: 400, valorMax: 1600 })).toHaveLength(3)
    expect(filtrarItens(itens, { valorMax: 200 })[0].id).toBe('2')
  })

  it('combina filtros', () => {
    const r = filtrarItens(itens, { categoria: 'Cartão', status: 'pendentes', texto: 'super' })
    expect(r).toHaveLength(1)
  })

  it('aceita transações com campo amount', () => {
    const transacoes = [{ id: 't1', desc: 'Salário', amount: 5000, categoria: 'Recebimento', pago: true }]
    expect(filtrarItens(transacoes, { valorMin: 1000 })).toHaveLength(1)
  })
})

describe('resumoFiltro', () => {
  it('soma total, pago e pendente', () => {
    const r = resumoFiltro(itens)
    expect(r.quantidade).toBe(4)
    expect(r.total).toBeCloseTo(3405.88, 2)
    expect(r.totalPago).toBeCloseTo(1990, 2)
    expect(r.totalPendente).toBeCloseTo(1415.88, 2)
  })

  it('resumo vazio', () => {
    expect(resumoFiltro([])).toEqual({ quantidade: 0, total: 0, totalPago: 0, totalPendente: 0 })
  })
})

describe('categoriasDisponiveis', () => {
  it('retorna categorias únicas e ordenadas', () => {
    expect(categoriasDisponiveis(itens)).toEqual(['Cartão', 'Empréstimo', 'Fixo', 'Variável'])
  })
})
