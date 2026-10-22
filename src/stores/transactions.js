import { defineStore } from 'pinia'
import { usePlanStore } from 'src/stores/plan'
import { cents } from 'src/utils/format'
import { monthKey } from 'src/utils/dates'
import { filtrarItens } from 'src/services/calc/filters'

/**
 * Camada de compatibilidade: expõe os lançamentos do fluxo de caixa no formato
 * "transação" (data, valor, tipo, categoria) usado pelas telas existentes.
 * A fonte da verdade continua sendo o `plan` store (arquivo fluxo-caixa.txt).
 */
export const useTransactionStore = defineStore('transactions', {
  state: () => ({
    loading: false,
    error: null,
  }),

  getters: {
    /** Todos os lançamentos de todos os meses, normalizados. */
    all: () => {
      const plan = usePlanStore()
      const lista = []
      plan.meses.forEach((mes) => {
        mes.entradas.forEach((entrada) => {
          lista.push({
            id: entrada.id,
            desc: entrada.desc || 'Recebimento',
            amount: entrada.valor,
            type: 'income',
            category: 'Recebimento',
            date: `${mes.id}-${String(entrada.dia).padStart(2, '0')}`,
            mesRef: mes.id,
            vencimentoDia: entrada.dia,
            pago: true,
            dataPagamento: null,
          })
        })
        mes.itens.forEach((item) => {
          lista.push({
            id: item.id,
            desc: item.desc,
            amount: item.valor,
            type: 'expense',
            category: item.categoria,
            date: `${mes.id}-${String(item.vencimentoDia).padStart(2, '0')}`,
            mesRef: mes.id,
            vencimentoDia: item.vencimentoDia,
            cartaoId: item.cartaoId,
            dividaId: item.dividaId,
            parcelas: item.parcelas,
            pago: item.pago,
            dataPagamento: item.dataPagamento,
          })
        })
      })
      return lista
    },

    transactions: (state) => state.all,

    recentTransactions: (state) =>
      [...state.all].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5),

    monthlyTransactions: (state) => {
      const agora = monthKey(new Date())
      return state.all.filter((t) => t.mesRef === agora)
    },

    monthlyIncome: (state) =>
      cents(
        state.monthlyTransactions
          .filter((t) => t.type === 'income')
          .reduce((acc, t) => acc + t.amount, 0)
      ),

    monthlyExpenses: (state) =>
      cents(
        state.monthlyTransactions
          .filter((t) => t.type === 'expense')
          .reduce((acc, t) => acc + t.amount, 0)
      ),

    totalBalance: (state) =>
      cents(
        state.all.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0)
      ),
  },

  actions: {
    async init() {
      const plan = usePlanStore()
      await plan.init()
    },

    async fetchTransactions(params = {}) {
      this.loading = true
      try {
        await this.init()
        let lista = this.all
        if (params.startDate) lista = lista.filter((t) => t.date >= params.startDate)
        if (params.endDate) lista = lista.filter((t) => t.date <= params.endDate)
        if (params.type) lista = lista.filter((t) => t.type === params.type)
        if (params.category) lista = lista.filter((t) => t.category === params.category)
        if (
          params.texto ||
          params.cartaoId ||
          params.status ||
          params.valorMin ||
          params.valorMax
        ) {
          lista = filtrarItens(lista, params)
        }
        if (params.limit) lista = lista.slice(0, params.limit)
        return lista
      } finally {
        this.loading = false
      }
    },

    async fetchRecentTransactions(limit = 5) {
      await this.init()
      return this.recentTransactions.slice(0, limit)
    },

    getTransactionById(id) {
      return this.all.find((t) => t.id === id) || null
    },

    async createTransaction(transactionData) {
      const plan = usePlanStore()
      await plan.init()

      const mesRef = monthKey(transactionData.date || new Date())
      const dia = Number(String(transactionData.date || '').slice(-2)) || 10

      if (transactionData.type === 'income') {
        await plan.upsertEntrada(mesRef, {
          id: transactionData.id,
          dia,
          valor: transactionData.amount,
          desc: transactionData.description || 'Recebimento',
        })
      } else {
        await plan.addItem(mesRef, {
          id: transactionData.id,
          desc: transactionData.description,
          valor: transactionData.amount,
          categoria: transactionData.category || 'Fixo',
          vencimentoDia: dia,
        })
      }

      return this.getTransactionById(transactionData.id)
    },

    async updateTransaction({ id, ...updateData }) {
      const plan = usePlanStore()
      await plan.init()
      const transaction = this.getTransactionById(id)
      if (!transaction) return null

      if (transaction.type === 'income') {
        const mes = plan.mes(transaction.mesRef)
        const entrada = mes?.entradas.find((e) => e.id === id)
        if (entrada) {
          await plan.upsertEntrada(transaction.mesRef, {
            ...entrada,
            dia: updateData.date ? Number(String(updateData.date).slice(-2)) : entrada.dia,
            valor: updateData.amount ?? entrada.valor,
            desc: updateData.description || entrada.desc,
          })
        }
      } else {
        await plan.updateItem(transaction.mesRef, id, {
          desc: updateData.description ?? transaction.desc,
          valor: updateData.amount ?? transaction.amount,
          categoria: updateData.category ?? transaction.categoria,
          vencimentoDia: updateData.date ? Number(String(updateData.date).slice(-2)) : transaction.vencimentoDia,
        })
      }

      return this.getTransactionById(id)
    },

    async deleteTransaction(id) {
      const plan = usePlanStore()
      await plan.init()
      const transaction = this.getTransactionById(id)
      if (!transaction) return false

      if (transaction.type === 'income') {
        await plan.removeEntrada(transaction.mesRef, id)
      } else {
        await plan.removeItem(transaction.mesRef, id)
      }
      return true
    },

    async getCategorySpending() {
      const mapa = new Map()
      this.all
        .filter((t) => t.type === 'expense')
        .forEach((t) => {
          const atual = mapa.get(t.category) || 0
          mapa.set(t.category, cents(atual + t.amount))
        })
      return [...mapa.entries()].map(([category, total]) => ({ category, total }))
    },

    async getTransactionsByDateRange(startDate, endDate) {
      return this.fetchTransactions({ startDate, endDate })
    },
  },
})
