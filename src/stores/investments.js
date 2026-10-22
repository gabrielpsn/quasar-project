import { defineStore } from 'pinia'
import { investmentsRepo } from 'src/services/repositories'
import { shortId } from 'src/utils/uuid'
import { cents } from 'src/utils/format'
import { nowISO } from 'src/utils/dates'

export const useInvestmentStore = defineStore('investments', {
  state: () => ({
    investments: [],
    loading: false,
    error: null,
    initialized: false,
  }),

  getters: {
    totalInvestido: (state) =>
      cents(state.investments.reduce((acc, i) => acc + (Number(i.valorAplicado) || 0), 0)),
    valorAtualTotal: (state) =>
      cents(state.investments.reduce((acc, i) => acc + (Number(i.valorAtual) || 0), 0)),
    resultadoTotal: (state) =>
      cents(
        state.investments.reduce(
          (acc, i) => acc + ((Number(i.valorAtual) || 0) - (Number(i.valorAplicado) || 0)),
          0
        )
      ),
    porTipo: (state) => {
      const mapa = new Map()
      state.investments.forEach((i) => {
        const chave = i.tipo || 'Renda Fixa'
        const atual = mapa.get(chave) || { tipo: chave, aplicado: 0, atual: 0 }
        atual.aplicado = cents(atual.aplicado + (Number(i.valorAplicado) || 0))
        atual.atual = cents(atual.atual + (Number(i.valorAtual) || 0))
        mapa.set(chave, atual)
      })
      return [...mapa.values()]
    },
    byId: (state) => (id) => state.investments.find((i) => i.id === id) || null,
  },

  actions: {
    async init() {
      if (this.initialized) return
      this.loading = true
      try {
        const data = await investmentsRepo.load()
        this.investments = Array.isArray(data) ? data : []
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
      return investmentsRepo.save(this.investments)
    },

    async fetchInvestments() {
      await this.init()
      return this.investments
    },

    async createInvestment(payload) {
      const item = {
        id: payload.id || shortId('inv'),
        nome: payload.nome || 'Investimento',
        ticker: payload.ticker || '',
        tipo: payload.tipo || 'Renda Fixa',
        valorAplicado: cents(payload.valorAplicado || 0),
        valorAtual: cents(payload.valorAtual ?? payload.valorAplicado ?? 0),
        dy: Number(payload.dy || 0),
        dataAquisicao: payload.dataAquisicao || nowISO(),
        criadoEm: nowISO(),
      }
      this.investments.push(item)
      await this.persist()
      return item
    },

    async updateInvestment({ id, ...patch }) {
      const index = this.investments.findIndex((i) => i.id === id)
      if (index === -1) return null
      const atual = this.investments[index]
      this.investments.splice(index, 1, {
        ...atual,
        ...patch,
        valorAplicado:
          patch.valorAplicado !== undefined ? cents(patch.valorAplicado) : atual.valorAplicado,
        valorAtual: patch.valorAtual !== undefined ? cents(patch.valorAtual) : atual.valorAtual,
      })
      await this.persist()
      return this.investments[index]
    },

    async removeInvestment(id) {
      this.investments = this.investments.filter((i) => i.id !== id)
      await this.persist()
      return true
    },
  },
})
