import { describe, expect, it } from 'vitest'
import {
  convertGeminiV22,
  extractLegacyPayload,
  parseLegacyMonth,
} from './geminiV22'

const finDb = {
  'Outubro 2026': {
    entradas: { 10: 2500, 15: 3305, 30: 1852 },
    itens: [
      { desc: 'Parcela Carro', valor: 1540, categoria: 'Fixo', vencimento: 10 },
      { desc: '[Cartão Atacadão] Supermercado', valor: 1255.38, categoria: 'Cartão', vencimento: 1 },
      { desc: 'Nubank Empréstimo', valor: 460, categoria: 'Empréstimo', vencimento: 15 },
    ],
  },
  'Novembro 2026': {
    entradas: { 10: 5000, 15: 10305 },
    itens: [{ desc: 'Parcela Carro', valor: 1540, categoria: 'Fixo', vencimento: 10 }],
  },
}

const invDb = [
  { ticker: 'CTPS11', tipo: 'Papel (Recebíveis)', cotas: 50, preco: 7.5 },
  { ticker: 'HGLG11', tipo: 'Tijolo (Logística)', cotas: 1, preco: 147.57 },
]

describe('parseLegacyMonth', () => {
  it('converte nomes de mês em chave ISO', () => {
    expect(parseLegacyMonth('Outubro 2026')).toBe('2026-10')
    expect(parseLegacyMonth('março de 2027')).toBe('2027-03')
    expect(parseLegacyMonth('Dez/2025')).toBe('2025-12')
  })

  it('aceita chave ISO e rejeita lixo', () => {
    expect(parseLegacyMonth('2026-10')).toBe('2026-10')
    expect(parseLegacyMonth('Foo 2026')).toBeNull()
    expect(parseLegacyMonth('')).toBeNull()
  })
})

describe('convertGeminiV22', () => {
  it('converte meses, entradas e itens', () => {
    const r = convertGeminiV22({ finDb, invDb })
    expect(r.plan.meses).toHaveLength(2)
    expect(r.plan.meses[0].id).toBe('2026-10')
    expect(r.plan.meses[0].entradas).toHaveLength(3)
    expect(r.plan.meses[0].itens).toHaveLength(3)
    expect(r.summary.meses).toBe(2)
    expect(r.summary.itens).toBe(4)
    expect(r.summary.entradas).toBe(5)
  })

  it('vincula o cartão pelo prefixo [Cartão X]', () => {
    const r = convertGeminiV22({ finDb })
    const item = r.plan.meses[0].itens.find((i) => i.desc.startsWith('[Cartão'))
    expect(item.cartaoId).toBe('card-atacadao')
  })

  it('ordena os meses cronologicamente', () => {
    const r = convertGeminiV22({
      finDb: {
        'Dezembro 2026': { entradas: {}, itens: [] },
        'Outubro 2026': { entradas: {}, itens: [] },
        'Novembro 2026': { entradas: {}, itens: [] },
      },
    })
    expect(r.plan.meses.map((m) => m.id)).toEqual(['2026-10', '2026-11', '2026-12'])
  })

  it('aplica flags de pagamento do mês', () => {
    const r = convertGeminiV22({
      finDb,
      flags: {
        'v22_item_Outubro 2026_0': 'true',
        'v22_date_item_Outubro 2026_0': '2026-10-09',
      },
    })
    const item = r.plan.meses[0].itens[0]
    expect(item.pago).toBe(true)
    expect(item.dataPagamento).toBe('2026-10-09')
    expect(item.valorPago).toBe(1540)
    expect(r.summary.pagos).toBe(1)
  })

  it('aplica pagamento de pendência herdada na aba seguinte', () => {
    const r = convertGeminiV22({
      finDb,
      flags: {
        'v22_carry_Novembro 2026_0': 'true',
        'v22_date_carry_Novembro 2026_0': '2026-11-05',
      },
    })
    const outubro = r.plan.meses[0]
    expect(outubro.itens[0].pago).toBe(true)
    expect(outubro.itens[0].dataPagamento).toBe('2026-11-05')
  })

  it('converte a carteira e calcula valores', () => {
    const r = convertGeminiV22({ finDb, invDb })
    expect(r.investments).toHaveLength(2)
    expect(r.investments[0].ticker).toBe('CTPS11')
    expect(r.investments[0].tipo).toBe('FII')
    expect(r.investments[0].valorAplicado).toBe(375)
    expect(r.summary.investimentos).toBe(2)
  })

  it('avisa mês com nome inválido e item sem valor', () => {
    const r = convertGeminiV22({
      finDb: {
        'Foo 2026': { entradas: {}, itens: [] },
        'Outubro 2026': { entradas: {}, itens: [{ desc: 'X', valor: 0 }] },
      },
    })
    expect(r.warnings.some((w) => /Foo 2026/.test(w))).toBe(true)
    expect(r.warnings.some((w) => /sem valor/.test(w))).toBe(true)
  })

  it('não quebra sem banco de fluxo', () => {
    const r = convertGeminiV22({})
    expect(r.plan.meses).toEqual([])
    expect(r.warnings[0]).toMatch(/fin_db_v22/)
  })
})

describe('extractLegacyPayload', () => {
  it('lê um dump de localStorage com strings', () => {
    const dump = JSON.stringify({
      fin_db_v22: JSON.stringify(finDb),
      inv_db_v22: JSON.stringify(invDb),
      'v22_item_Outubro 2026_0': 'true',
    })
    const r = extractLegacyPayload(dump)
    expect(Object.keys(r.finDb)).toHaveLength(2)
    expect(r.invDb).toHaveLength(2)
    expect(r.flags['v22_item_Outubro 2026_0']).toBe('true')
  })

  it('lê objeto com fin_db_v22 já parseado', () => {
    const r = extractLegacyPayload({ fin_db_v22: finDb, inv_db_v22: invDb })
    expect(r.finDb['Outubro 2026'].itens).toHaveLength(3)
  })

  it('lê apenas a carteira', () => {
    const r = extractLegacyPayload({ inv_db_v22: invDb })
    expect(r.finDb).toBeNull()
    expect(r.invDb).toHaveLength(2)
  })

  it('rejeita texto vazio e JSON inválido', () => {
    expect(() => extractLegacyPayload('')).toThrow(/Cole o conteúdo/)
    expect(() => extractLegacyPayload('{oops')).toThrow(/JSON inválido/)
  })

  it('rejeita objeto sem dados reconhecíveis', () => {
    expect(() => extractLegacyPayload({ foo: 1 })).toThrow(/fin_db_v22/)
  })
})
