import { shortId } from 'src/utils/uuid'
import { cents } from 'src/utils/format'
import { monthKeyFromParts, nowISO } from 'src/utils/dates'

export const CARTOES_PADRAO = [
  { id: 'card-nubank-gabriel', nome: 'NUBank Gabriel', bandeira: 'mastercard', limite: 8000, diaFechamento: 8, diaVencimento: 15, cor: 'purple' },
  { id: 'card-atacadao', nome: 'Atacadão', bandeira: 'visa', limite: 3000, diaFechamento: 25, diaVencimento: 1, cor: 'blue' },
  { id: 'card-sim', nome: 'SIM', bandeira: 'mastercard', limite: 2500, diaFechamento: 3, diaVencimento: 10, cor: 'teal' },
  { id: 'card-porto-visa', nome: 'Porto Visa', bandeira: 'visa', limite: 2000, diaFechamento: 8, diaVencimento: 15, cor: 'indigo' },
  { id: 'card-bmg-lebiscuit', nome: 'BMG Lebiscuit', bandeira: 'mastercard', limite: 1800, diaFechamento: 8, diaVencimento: 15, cor: 'orange' },
  { id: 'card-mercado-pago', nome: 'Mercado Pago', bandeira: 'mastercard', limite: 1500, diaFechamento: 8, diaVencimento: 15, cor: 'light-blue' },
  { id: 'card-riachuelo', nome: 'Riachuelo', bandeira: 'elo', limite: 900, diaFechamento: 8, diaVencimento: 15, cor: 'red' },
  { id: 'card-americanas', nome: 'Americanas', bandeira: 'mastercard', limite: 800, diaFechamento: 8, diaVencimento: 15, cor: 'deep-orange' },
  { id: 'card-nubank-dinha', nome: 'Nubank Dinha', bandeira: 'mastercard', limite: 1200, diaFechamento: 25, diaVencimento: 1, cor: 'pink' },
  { id: 'card-caixa-tem', nome: 'Caixa Tem', bandeira: 'elo', limite: 600, diaFechamento: 3, diaVencimento: 10, cor: 'blue-grey' },
  { id: 'card-festa-ballet', nome: 'Festa Ballet', bandeira: 'outro', limite: 500, diaFechamento: 3, diaVencimento: 10, cor: 'amber' },
  { id: 'card-onze', nome: 'ONZE', bandeira: 'mastercard', limite: 700, diaFechamento: 8, diaVencimento: 15, cor: 'green' },
  { id: 'card-passai', nome: 'Passaí', bandeira: 'outro', limite: 400, diaFechamento: 25, diaVencimento: 1, cor: 'brown' },
]

export const CATEGORIAS_PADRAO = [
  { id: 'cat-fixo', nome: 'Gasto Fixo', tipo: 'saida', cor: 'blue', icone: 'home' },
  { id: 'cat-emprestimo', nome: 'Empréstimo', tipo: 'saida', cor: 'amber', icone: 'handshake' },
  { id: 'cat-cartao', nome: 'Cartão de Crédito', tipo: 'saida', cor: 'indigo', icone: 'credit_card' },
  { id: 'cat-variavel', nome: 'Variável', tipo: 'saida', cor: 'teal', icone: 'shopping_bag' },
  { id: 'cat-recebimento', nome: 'Recebimento', tipo: 'entrada', cor: 'green', icone: 'account_balance' },
]

const ITENS_OUTUBRO = [
  ['Parcela Carro', 1540.0, 'Fixo', 10],
  ['Parcela Casa', 930.0, 'Fixo', 10],
  ['Escola', 904.0, 'Fixo', 1],
  ['Parcela Energia Solar', 445.5, 'Fixo', 10],
  ['Conta Luz', 150.0, 'Fixo', 10],
  ['Conta Tim', 159.9, 'Fixo', 15],
  ['Escola Ballet', 110.0, 'Fixo', 10],
  ['Conta Claro', 33.9, 'Fixo', 10],
  ['Nubank Empréstimo', 460.0, 'Empréstimo', 15],
  ['Formatura', 380.0, 'Empréstimo', 15],
  ['Mercado Pago Empréstimo (10ª parc)', 388.22, 'Empréstimo', 15],
  ['[Cartão NUBank Gabriel] Fatura Geral', 2197.56, 'Cartão', 15],
  ['[Cartão Atacadão] Supermercado', 1255.38, 'Cartão', 1],
  ['[Cartão SIM] Fatura Geral', 1060.0, 'Cartão', 10],
  ['[Cartão Porto Visa] Fatura Geral', 856.78, 'Cartão', 15],
  ['[Cartão BMG Lebiscuit] Fatura Geral', 519.37, 'Cartão', 15],
  ['[Cartão Mercado Pago] Fatura Geral', 516.81, 'Cartão', 15],
  ['[Cartão Riachuelo] Fatura Geral', 473.65, 'Cartão', 15],
  ['[Cartão Americanas] Fatura Geral', 305.29, 'Cartão', 15],
  ['[Cartão Nubank Dinha] Fatura Geral', 200.0, 'Cartão', 1],
  ['[Cartão Caixa Tem] Fatura Geral', 120.95, 'Cartão', 10],
  ['[Cartão Festa Ballet] Festa Ballet', 110.0, 'Cartão', 10],
  ['[Cartão ONZE] Fatura Geral', 65.5, 'Cartão', 15],
  ['[Cartão Passaí] Fatura Geral', 58.3, 'Cartão', 1],
]

const ITENS_NOVEMBRO = [
  ['Parcela Carro', 1540.0, 'Fixo', 10],
  ['Parcela Casa', 930.0, 'Fixo', 10],
  ['Escola', 904.0, 'Fixo', 1],
  ['Parcela Energia Solar', 445.5, 'Fixo', 10],
  ['Conta Luz', 150.0, 'Fixo', 10],
  ['Conta Tim', 159.9, 'Fixo', 15],
  ['Escola Ballet', 110.0, 'Fixo', 10],
  ['Conta Claro', 33.9, 'Fixo', 10],
  ['Nubank Empréstimo', 460.0, 'Empréstimo', 15],
  ['Formatura', 380.0, 'Empréstimo', 15],
  ['Mercado Pago Empréstimo (10ª parc)', 388.22, 'Empréstimo', 15],
  ['[Cartão Atacadão] Supermercado', 986.49, 'Cartão', 1],
  ['[Cartão SIM] Fatura Parcial', 680.0, 'Cartão', 10],
  ['[Cartão BMG Lebiscuit] Fatura Parcial', 470.49, 'Cartão', 15],
  ['[Cartão Americanas] Fatura Parcial', 305.29, 'Cartão', 15],
  ['[Cartão NUBank Gabriel] Fatura Parcial', 250.0, 'Cartão', 15],
  ['[Cartão Mercado Pago] Fatura Parcial', 250.0, 'Cartão', 15],
  ['[Cartão Nubank Dinha] Fatura Parcial', 200.0, 'Cartão', 1],
  ['[Cartão Caixa Tem] Fatura Parcial', 120.95, 'Cartão', 10],
  ['[Cartão Festa Ballet] Festa Ballet', 110.0, 'Cartão', 10],
  ['[Cartão Riachuelo] Fatura Parcial', 89.9, 'Cartão', 15],
  ['[Cartão ONZE] Fatura Parcial', 65.5, 'Cartão', 15],
  ['[Cartão Passaí] Fatura Parcial', 58.3, 'Cartão', 1],
]

const ITENS_DEZEMBRO = [
  ['Parcela Carro', 1540.0, 'Fixo', 10],
  ['Parcela Casa', 930.0, 'Fixo', 10],
  ['Escola', 904.0, 'Fixo', 1],
  ['Parcela Energia Solar', 445.5, 'Fixo', 10],
  ['Conta Luz', 150.0, 'Fixo', 10],
  ['Conta Tim', 159.9, 'Fixo', 15],
  ['Escola Ballet', 110.0, 'Fixo', 10],
  ['Conta Claro', 33.9, 'Fixo', 10],
  ['Mercado Pago Empréstimo (Novo)', 780.0, 'Empréstimo', 15],
  ['Nubank Empréstimo', 460.0, 'Empréstimo', 15],
  ['Formatura', 380.0, 'Empréstimo', 15],
  ['Mercado Pago Empréstimo (10ª parc)', 388.22, 'Empréstimo', 15],
  ['[Cartão Atacadão] Supermercado', 986.49, 'Cartão', 1],
  ['[Cartão SIM] Fatura Parcial', 680.0, 'Cartão', 10],
  ['[Cartão BMG Lebiscuit] Fatura Parcial', 470.49, 'Cartão', 15],
  ['[Cartão Americanas] Fatura Parcial', 305.29, 'Cartão', 15],
  ['[Cartão NUBank Gabriel] Fatura Parcial', 250.0, 'Cartão', 15],
  ['[Cartão Mercado Pago] Fatura Parcial', 250.0, 'Cartão', 15],
  ['[Cartão Nubank Dinha] Fatura Parcial', 200.0, 'Cartão', 1],
  ['[Cartão Caixa Tem] Fatura Parcial', 120.95, 'Cartão', 10],
  ['[Cartão Festa Ballet] Festa Ballet (Última)', 110.0, 'Cartão', 10],
  ['[Cartão Riachuelo] Fatura Parcial', 89.9, 'Cartão', 15],
  ['[Cartão ONZE] Fatura Parcial', 65.5, 'Cartão', 15],
  ['[Cartão Passaí] Fatura Parcial', 58.3, 'Cartão', 1],
]

function buildEntradas(mes, valores) {
  return Object.entries(valores).map(([dia, valor]) => ({
    id: shortId('e'),
    dia: Number(dia),
    valor: cents(valor),
    desc: 'Recebimento',
  }))
}

function cartaoIdPorDescricao(desc) {
  const match = /^\[Cartão ([^\]]+)\]/.exec(desc || '')
  if (!match) return null
  const nome = match[1].trim()
  const card = CARTOES_PADRAO.find(
    (c) => c.nome.toLowerCase() === nome.toLowerCase() || nome.toLowerCase().includes(c.nome.toLowerCase())
  )
  return card ? card.id : null
}

function buildItens(mesKey, lista) {
  return lista.map(([desc, valor, categoria, vencimento]) => ({
    id: shortId('i'),
    desc,
    valor: cents(valor),
    categoria,
    vencimentoDia: vencimento,
    mesRef: mesKey,
    origem: { tipo: 'manual' },
    parcelas: null,
    cartaoId: categoria === 'Cartão' ? cartaoIdPorDescricao(desc) : null,
    dividaId: null,
    pago: false,
    dataPagamento: null,
    valorPago: null,
  }))
}

export function seedCards() {
  return CARTOES_PADRAO.map((c) => ({ ...c, ativo: true, criadoEm: nowISO() }))
}

export function seedDebts() {
  return [
    {
      id: 'debt-nubank-emprestimo',
      descricao: 'Nubank Empréstimo',
      credor: 'Nubank',
      valorOriginal: cents(9200),
      saldo: cents(4600),
      taxaJuros: 2.15,
      parcelas: 20,
      parcelasPagas: 10,
      diaVencimento: 15,
      quitada: false,
      cor: 'purple',
      criadoEm: nowISO(),
    },
    {
      id: 'debt-mercado-pago',
      descricao: 'Mercado Pago Empréstimo',
      credor: 'Mercado Pago',
      valorOriginal: cents(3882.2),
      saldo: cents(388.22),
      taxaJuros: 3.4,
      parcelas: 10,
      parcelasPagas: 9,
      diaVencimento: 15,
      quitada: false,
      cor: 'light-blue',
      criadoEm: nowISO(),
    },
    {
      id: 'debt-formatura',
      descricao: 'Formatura',
      credor: 'Faculdade',
      valorOriginal: cents(4560),
      saldo: cents(2280),
      taxaJuros: 0,
      parcelas: 12,
      parcelasPagas: 6,
      diaVencimento: 15,
      quitada: false,
      cor: 'amber',
      criadoEm: nowISO(),
    },
  ]
}

export function seedPlan() {
  const keyOut = monthKeyFromParts(2026, 10)
  const keyNov = monthKeyFromParts(2026, 11)
  const keyDez = monthKeyFromParts(2026, 12)

  return {
    meses: [
      {
        id: keyOut,
        rotulo: 'Outubro 2026',
        entradas: buildEntradas(keyOut, { 10: 2500.0, 15: 3305.0, 30: 1852.0 }),
        itens: buildItens(keyOut, ITENS_OUTUBRO),
      },
      {
        id: keyNov,
        rotulo: 'Novembro 2026',
        entradas: buildEntradas(keyNov, { 10: 5000.0, 15: 10305.0, 30: 6815.22 }),
        itens: buildItens(keyNov, ITENS_NOVEMBRO),
      },
      {
        id: keyDez,
        rotulo: 'Dezembro 2026',
        entradas: buildEntradas(keyDez, { 10: 2500.0, 15: 3305.0, 30: 1852.0 }),
        itens: buildItens(keyDez, ITENS_DEZEMBRO),
      },
    ],
  }
}

export function seedInvestments() {
  const brutos = [
    { ticker: 'CTPS11', tipo: 'Papel (Recebíveis)', classe: 'FII', cotas: 50, precoMedio: 7.5, precoAtual: 7.5, dyMensal: 0.11 },
    { ticker: 'GARE11', tipo: 'Tijolo (Renda Urbana)', classe: 'FII', cotas: 17, precoMedio: 8.35, precoAtual: 8.35, dyMensal: 0.08 },
    { ticker: 'HGLG11', tipo: 'Tijolo (Logística)', classe: 'FII', cotas: 1, precoMedio: 147.57, precoAtual: 147.57, dyMensal: 1.06 },
    { ticker: 'MXRF11', tipo: 'Papel (Recebíveis)', classe: 'FII', cotas: 33, precoMedio: 9.08, precoAtual: 9.08, dyMensal: 0.11 },
    { ticker: 'VIUR11', tipo: 'Tijolo (Híbrido/Shoppings)', classe: 'FII', cotas: 50, precoMedio: 6.5, precoAtual: 6.5, dyMensal: 0.09 },
  ]

  return brutos.map((b) => ({
    id: shortId('inv'),
    nome: b.ticker,
    ticker: b.ticker,
    tipo: b.classe || 'FII',
    descricao: b.tipo,
    cotas: b.cotas,
    precoMedio: b.precoMedio,
    precoAtual: b.precoAtual,
    valorAplicado: cents(b.cotas * b.precoMedio),
    valorAtual: cents(b.cotas * b.precoAtual),
    dy: cents(b.precoMedio ? (b.dyMensal * 12 * 100) / b.precoMedio : 0),
    dataAquisicao: null,
    criadoEm: nowISO(),
  }))
}

export function seedSettings() {
  return {
    categorias: CATEGORIAS_PADRAO.map((c) => ({ ...c })),
    recorrencias: [],
    reserva: { mesesCobertura: 6, aporteMensal: 0, valorAtual: 0 },
    tema: 'dark',
    locale: 'pt-BR',
    moeda: 'BRL',
  }
}
