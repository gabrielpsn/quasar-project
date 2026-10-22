import { defineStore } from 'pinia'
import { settingsRepo } from 'src/services/repositories'
import { seedSettings } from 'src/services/seed/defaultData'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: null,
    loading: false,
    error: null,
    initialized: false,
  }),

  getters: {
    reserva: (state) => ({
      mesesCobertura: 6,
      aporteMensal: 0,
      valorAtual: 0,
      ...(state.settings?.reserva || {}),
    }),
    locale: (state) => state.settings?.locale || 'pt-BR',
    moeda: (state) => state.settings?.moeda || 'BRL',
    tema: (state) => state.settings?.tema || 'dark',
  },

  actions: {
    async init() {
      if (this.initialized) return this.settings
      this.loading = true
      try {
        const data = await settingsRepo.load()
        this.settings = { ...seedSettings(), ...(data || {}) }
        this.initialized = true
        return this.settings
      } catch (error) {
        this.error = error.message
        return null
      } finally {
        this.loading = false
      }
    },

    async reload() {
      this.initialized = false
      return this.init()
    },

    async save(patch) {
      await this.init()
      this.settings = { ...this.settings, ...patch }
      return settingsRepo.save(this.settings)
    },

    async saveNow(patch) {
      await this.init()
      this.settings = { ...this.settings, ...patch }
      return settingsRepo.saveNow(this.settings)
    },

    async updateReserva(patch) {
      return this.save({ reserva: { ...this.reserva, ...patch } })
    },
  },
})
