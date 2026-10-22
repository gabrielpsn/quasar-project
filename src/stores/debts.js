import { defineStore } from 'pinia'
import { debtsRepo } from 'src/services/repositories'
import { shortId } from 'src/utils/uuid'
import { cents } from 'src/utils/format'
import { nowISO } from 'src/utils/dates'

export const useDebtStore = defineStore('debts', {
  state: () => ({
    debts: [],
    loading: false,
    error: null,
    initialized: false,
  }),

  getters: {
    openDebts: (state) => state.debts.filter((d) => !d.quitada),
    paidDebts: (state) => state.debts.filter((d) => d.quitada),
    totalDevido: (state) => cents(state.debts.filter((d) => !d.quitada).reduce((acc, d) => acc + (Number(d.saldo) || 0), 0)),
    totalOriginal: (state) => cents(state.debts.reduce((acc, d) => acc + (Number(d.valorOriginal) || 0), 0)),
    debtOptions: (state) =>
      state.debts.map((d) => ({ label: d.descricao || d.nome || 'Dívida', value: d.id })),
  },

  actions: {
    async init() {
      if (this.initialized) return
      this.loading = true
      try {
        const data = await debtsRepo.load()
        this.debts = Array.isArray(data) ? data : []
        this.initialized = true
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async reload() {
      this.initialized = false
      await this.init()
    },

    persist() {
      return debtsRepo.save(this.debts)
    },

    async fetchDebts() {
      await this.init()
      return this.debts
    },

    getDebtById(id) {
      return this.debts.find((d) => d.id === id) || null
    },

    async createDebt(debtData) {
      const valorOriginal = cents(debtData.valorOriginal || 0)
      const quitada = debtData.quitada ?? false
      const debt = {
        id: debtData.id || shortId('d'),
        descricao: debtData.descricao || debtData.nome || 'Nova dívida',
        credor: debtData.credor || '',
        valorOriginal,
        saldo: quitada ? 0 : cents(debtData.saldo ?? valorOriginal),
        taxaJuros: Number(debtData.taxaJuros || 0),
        parcelas: Number(debtData.parcelas || 1),
        parcelasPagas: Number(debtData.parcelasPagas || 0),
        diaVencimento: Number(debtData.diaVencimento) || 10,
        quitada,
        cor: debtData.cor || 'deep-orange',
        criadoEm: nowISO(),
      }
      this.debts.push(debt)
      await this.persist()
      return debt
    },

    async updateDebt({ id, ...patch }) {
      const index = this.debts.findIndex((d) => d.id === id)
      if (index === -1) return null
      const atual = this.debts[index]
      this.debts.splice(index, 1, {
        ...atual,
        ...patch,
        valorOriginal:
          patch.valorOriginal !== undefined ? cents(patch.valorOriginal) : atual.valorOriginal,
        saldo: patch.saldo !== undefined ? cents(patch.saldo) : atual.saldo,
      })
      await this.persist()
      return this.debts[index]
    },

    async payInstallment(id, { valor, parcela } = {}) {
      const debt = this.getDebtById(id)
      if (!debt) return null
      const saldo = cents(Math.max(0, (debt.saldo || 0) - (valor ?? debt.saldo)))
      const parcelasPagas = Math.min(debt.parcelas, (debt.parcelasPagas || 0) + (parcela ? 1 : 0))
      return this.updateDebt({ id, saldo, parcelasPagas, quitada: saldo === 0 })
    },

    async settleDebt(id) {
      return this.updateDebt({ id, quitada: true, saldo: 0 })
    },

    async deleteDebt(id) {
      this.debts = this.debts.filter((d) => d.id !== id)
      await this.persist()
      return true
    },
  },
})
