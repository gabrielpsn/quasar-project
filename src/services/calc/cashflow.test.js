import { describe, expect, it } from 'vitest'
import {
  classificarSaldo,
  itensPendentes,
  itensPorDia,
  pendenciasAnteriores,
  resumoMes,
  saldoDevedor,
  saldoDoDia,
  seriePorDia,
  totaisPorCategoria,
  totalEntradas,
  totalGeral,
  totalPago,
  totalPendente,
} from './cashflow'

const mes = {
  id: '2026-10',
  rotulo: 'Outubro 2026',
  entradas: [
    { id: 'e1', desc: 'Salário', valor: 5000, dia: 10 },
    { id: 'e2', desc: 'Freela', valor: 800.5, dia: 30 },
  ],
  itens: [
    { id: 'i1', desc: 'Aluguel', valor: 1500, vencimentoDia: 10, categoria: 'Fixo', pago: false },
    { id: 'i2', desc: 'Luz', valor: 200.25, vencimentoDia: 15, categoria: 'Variável', pago: true, valorPago: 210 },
    { id: 'i3', desc: 'Cartão', valor: 300, vencimentoDia: 30, categoria: 'Cartão', pago: false },
  ],
}

describe('totais do mês', () => {
  it('soma as entradas', () => {
    expect(totalEntradas(mes)).toBe(5800.5)
  })

  it('soma o total geral', () => {
    expect(totalGeral(mes)).toBe(2000.25)
  })

  it('soma o que já foi pago usando o valor pago', () => {
    expect(totalPago(mes)).toBe(210)
  })

  it('soma apenas o que está pendente', () => {
    expect(totalPendente(mes)).toBe(1800)
    expect(itensPendentes(mes)).toHaveLength(2)
  })

  it('calcula o saldo devedor', () => {
    expect(saldoDevedor(mes)).toBe(1790.25)
  })

  it('lida com mês vazio', () => {
    expect(totalEntradas(null)).toBe(0)
    expect(totalGeral({})).toBe(0)
    expect(totalPago({})).toBe(0)
    expect(totalPendente({})).toBe(0)
  })
})

describe('agrupamento por dia', () => {
  it('agrupa os itens nos dias canônicos', () => {
    const grupos = itensPorDia(mes)
    const dia10 = grupos.find((g) => g.dia === 10)
    const dia30 = grupos.find((g) => g.dia === 30)
    expect(dia10.itens).toHaveLength(1)
    expect(dia30.itens).toHaveLength(1)
    expect(grupos.find((g) => g.dia === 1).itens).toHaveLength(0)
  })

  it('calcula o saldo de cada dia', () => {
    const r = saldoDoDia(mes, 10)
    expect(r.entrada).toBe(5000)
    expect(r.aPagar).toBe(1500)
    expect(r.saldo).toBe(3500)
    expect(classificarSaldo(r.saldo)).toBe('ok')
  })

  it('considera pendências anteriores no saldo do dia', () => {
    const pendencias = [{ id: 'x', valor: 100, vencimentoDia: 10 }]
    expect(saldoDoDia(mes, 10, pendencias).aPagar).toBe(1600)
  })

  it('sinaliza déficit', () => {
    expect(classificarSaldo(-1)).toBe('deficit')
    expect(classificarSaldo(0)).toBe('zerado')
  })

  it('gera série por dia com entrada, saída e saldo', () => {
    const serie = seriePorDia(mes)
    expect(serie).toHaveLength(4)
    expect(serie.find((s) => s.dia === 30).saldo).toBe(500.5)
  })
})

describe('pendências e resumo', () => {
  const meses = [
    { ...mes, id: '2026-09', rotulo: 'Setembro 2026' },
    mes,
    { ...mes, id: '2026-11', rotulo: 'Novembro 2026' },
  ]

  it('herda pendências dos meses anteriores', () => {
    const pendentes = pendenciasAnteriores(meses, '2026-11')
    expect(pendentes).toHaveLength(4)
    expect(pendentes[0].mesOrigem).toBe('2026-09')
    expect(pendentes[0].pendenteDe).toBe(true)
  })

  it('não herda nada no primeiro mês', () => {
    expect(pendenciasAnteriores(meses, '2026-09')).toEqual([])
  })

  it('separa pendente do mês e pendente anterior', () => {
    const pendencias = pendenciasAnteriores(meses, '2026-11')
    const r = resumoMes(mes, pendencias)
    expect(r.renda).toBe(5800.5)
    expect(r.pendenteDoMes).toBe(1800)
    expect(r.pendenteAnterior).toBe(3600)
    expect(r.pendente).toBe(5400)
    expect(r.sobra).toBe(400.5)
  })

  it('agrupa totais por categoria em ordem decrescente', () => {
    const r = totaisPorCategoria(mes)
    expect(r[0].categoria).toBe('Fixo')
    expect(r[0].total).toBe(1500)
  })
})
