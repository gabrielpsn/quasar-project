import { defineStore } from 'pinia'
import { assetsRepo } from 'src/services/repositories'
import { shortId } from 'src/utils/uuid'
import { cents } from 'src/utils/format'
import { nowISO } from 'src/utils/dates'

export const useNetWorthStore = defineStore('networth', {
  state: () => ({
    ativos: [],
    passivos: [],
    snapshots: [],
    loading: false,
    error: null,
    initialized: false,
  }),

  getters: {
    totalBens: (state) => cents(state.ativos.reduce((acc, a) => acc + (Number(a.valor) || 0), 0)),
    totalPassivos: (state) => cents(state.passivos.reduce((acc, a) => acc + (Number(a.valor) || 0), 0)),
    byTipo: (state) => {
      const mapa = new Map()
      state.ativos.forEach((a) => {
        const chave = a.tipo || 'Outros'
        mapa.set(chave, cents((mapa.get(chave) || 0) + (Number(a.valor) || 0)))
      })
      return [...mapa.entries()].map(([tipo, valor]) => ({ tipo, valor }))
    },
    byId: (state) => (id) => state.ativos.find((a) => a.id === id) || null,
  },

  actions: {
    async init() {
      if (this.initialized) return
      this.loading = true
      try {
        const data = await assetsRepo.load()
        this.ativos = Array.isArray(data?.ativos) ? data.ativos : []
        this.passivos = Array.isArray(data?.passivos) ? data.passivos : []
        this.snapshots = Array.isArray(data?.snapshots) ? data.snapshots : []
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
      return assetsRepo.save({
        ativos: this.ativos,
        passivos: this.passivos,
        snapshots: this.snapshots,
      })
    },

    async fetchAssets() {
      await this.init()
      return this.ativos
    },

    async createAsset(payload) {
      const asset = {
        id: payload.id || shortId('a'),
        nome: payload.nome || 'Bem',
        tipo: payload.tipo || 'Imóvel',
        valor: cents(payload.valor || 0),
        valorAquisicao: cents(payload.valorAquisicao ?? payload.valor ?? 0),
        descricao: payload.descricao || '',
        criadoEm: nowISO(),
      }
      this.ativos.push(asset)
      await this.persist()
      return asset
    },

    async updateAsset({ id, ...patch }) {
      const index = this.ativos.findIndex((a) => a.id === id)
      if (index === -1) return null
      const atual = this.ativos[index]
      this.ativos.splice(index, 1, {
        ...atual,
        ...patch,
        valor: patch.valor !== undefined ? cents(patch.valor) : atual.valor,
        valorAquisicao:
          patch.valorAquisicao !== undefined ? cents(patch.valorAquisicao) : atual.valorAquisicao,
      })
      await this.persist()
      return this.ativos[index]
    },

    async removeAsset(id) {
      this.ativos = this.ativos.filter((a) => a.id !== id)
      await this.persist()
      return true
    },

    async addSnapshot(patrimonioLiquido) {
      this.snapshots.push({
        id: shortId('s'),
        data: nowISO(),
        patrimonioLiquido: cents(patrimonioLiquido),
      })
      await this.persist()
    },
  },
})
