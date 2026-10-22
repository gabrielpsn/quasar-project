import { defineStore } from 'pinia'
import { cardsRepo } from 'src/services/repositories'
import { shortId } from 'src/utils/uuid'
import { cents } from 'src/utils/format'
import { nowISO } from 'src/utils/dates'

export const useCardStore = defineStore('cards', {
  state: () => ({
    cards: [],
    loading: false,
    error: null,
    initialized: false,
  }),

  getters: {
    activeCards: (state) => state.cards.filter((c) => c.ativo !== false),
    cardOptions: (state) =>
      state.cards.map((c) => ({ label: c.nome, value: c.id, color: c.cor })),
    cardById: (state) => (id) => state.cards.find((c) => c.id === id) || null,
    limiteTotal: (state) => cents(state.cards.reduce((acc, c) => acc + (Number(c.limite) || 0), 0)),
  },

  actions: {
    async init() {
      if (this.initialized) return
      this.loading = true
      try {
        const data = await cardsRepo.load()
        this.cards = Array.isArray(data) ? data : []
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
      return cardsRepo.save(this.cards)
    },

    async fetchCards() {
      await this.init()
      return this.cards
    },

    async createCard(cardData) {
      const card = {
        id: cardData.id || shortId('c'),
        nome: cardData.nome || 'Novo cartão',
        bandeira: cardData.bandeira || 'outro',
        limite: cents(cardData.limite || 0),
        diaFechamento: Number(cardData.diaFechamento) || 10,
        diaVencimento: Number(cardData.diaVencimento) || 15,
        cor: cardData.cor || 'indigo',
        ativo: cardData.ativo !== false,
        criadoEm: nowISO(),
      }
      this.cards.push(card)
      await this.persist()
      return card
    },

    async updateCard({ id, ...patch }) {
      const index = this.cards.findIndex((c) => c.id === id)
      if (index === -1) return null
      this.cards.splice(index, 1, {
        ...this.cards[index],
        ...patch,
        limite: patch.limite !== undefined ? cents(patch.limite) : this.cards[index].limite,
      })
      await this.persist()
      return this.cards[index]
    },

    async deleteCard(id) {
      this.cards = this.cards.filter((c) => c.id !== id)
      await this.persist()
      return true
    },
  },
})
