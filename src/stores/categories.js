import { defineStore } from 'pinia'
import { useSettingsStore } from 'src/stores/settings'
import { shortId } from 'src/utils/uuid'
import { nowISO } from 'src/utils/dates'

export const useCategoryStore = defineStore('categories', {
  state: () => ({
    categories: [],
    loading: false,
    error: null,
    initialized: false,
  }),

  getters: {
    expenseCategories: (state) => state.categories.filter((c) => c.tipo !== 'entrada'),
    incomeCategories: (state) => state.categories.filter((c) => c.tipo === 'entrada'),
    categoryOptions: (state) =>
      state.categories.map((c) => ({
        label: c.nome,
        value: c.id,
        color: c.cor,
        icon: c.icone,
        type: c.tipo,
      })),
  },

  actions: {
    async init() {
      if (this.initialized) return
      this.loading = true
      try {
        const settingsStore = useSettingsStore()
        const settings = await settingsStore.init()
        this.categories = Array.isArray(settings?.categorias) ? settings.categorias : []
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

    async persist() {
      const settingsStore = useSettingsStore()
      await settingsStore.init()
      return settingsStore.save({ categorias: this.categories })
    },

    async fetchCategories() {
      await this.init()
      return this.categories
    },

    /**
     * Garante que existam as categorias padrão (idempotente).
     */
    async initializeDefaultCategories() {
      if (this.categories.length) return this.categories
      const { CATEGORIAS_PADRAO } = await import('src/services/seed/defaultData')
      this.categories = CATEGORIAS_PADRAO.map((c) => ({ ...c }))
      await this.persist()
      return this.categories
    },

    getCategoryById(id) {
      return this.categories.find((c) => c.id === id) || null
    },

    getCategoryName(id) {
      const category = this.getCategoryById(id)
      return category ? category.nome : 'Sem categoria'
    },

    async createCategory(categoryData) {
      const categoria = {
        id: categoryData.id || shortId('cat'),
        nome: categoryData.nome,
        tipo: categoryData.tipo || 'saida',
        cor: categoryData.cor || 'blue',
        icone: categoryData.icone || 'label',
        descricao: categoryData.descricao || '',
        padrao: !!categoryData.padrao,
        criadoEm: nowISO(),
      }
      this.categories.push(categoria)
      await this.persist()
      return categoria
    },

    async updateCategory({ id, ...updateData }) {
      const index = this.categories.findIndex((c) => c.id === id)
      if (index === -1) return null
      this.categories.splice(index, 1, { ...this.categories[index], ...updateData })
      await this.persist()
      return this.categories[index]
    },

    async deleteCategory(id) {
      this.categories = this.categories.filter((c) => c.id !== id)
      await this.persist()
      return true
    },
  },
})
