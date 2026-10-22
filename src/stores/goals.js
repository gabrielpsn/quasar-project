import { defineStore } from 'pinia'
import { goalsRepo } from 'src/services/repositories'
import { shortId } from 'src/utils/uuid'
import { cents } from 'src/utils/format'
import { nowISO } from 'src/utils/dates'

export const useGoalStore = defineStore('goals', {
  state: () => ({
    goals: [],
    loading: false,
    error: null,
    initialized: false,
  }),

  getters: {
    activeGoals: (state) => state.goals.filter((g) => !g.achieved),
    completedGoals: (state) => state.goals.filter((g) => g.achieved),
    goalsByProgress: (state) =>
      [...state.goals].sort((a, b) => {
        const pa = (a.current_amount || 0) / (a.target_amount || 1)
        const pb = (b.current_amount || 0) / (b.target_amount || 1)
        return pb - pa
      }),
  },

  actions: {
    async init() {
      if (this.initialized) return
      this.loading = true
      try {
        const data = await goalsRepo.load()
        this.goals = Array.isArray(data) ? data : []
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
      return goalsRepo.save(this.goals)
    },

    async fetchGoals() {
      await this.init()
      return this.goals
    },

    getGoalById(id) {
      return this.goals.find((g) => g.id === id) || null
    },

    async createGoal(goalData) {
      const goal = {
        id: goalData.id || shortId('g'),
        name: goalData.name || goalData.nome || 'Nova meta',
        description: goalData.description || '',
        target_amount: cents(goalData.target_amount || 0),
        current_amount: cents(goalData.current_amount || 0),
        target_date: goalData.target_date || null,
        achieved: !!goalData.achieved,
        color: goalData.color || 'primary',
        icon: goalData.icon || 'emoji_events',
        tipo: goalData.tipo || 'projeto',
        aporteMensal: cents(goalData.aporteMensal || 0),
        criadoEm: nowISO(),
      }
      this.goals.push(goal)
      await this.persist()
      return goal
    },

    async updateGoal({ id, ...updateData }) {
      const index = this.goals.findIndex((g) => g.id === id)
      if (index === -1) return null
      const atual = this.goals[index]
      this.goals.splice(index, 1, {
        ...atual,
        ...updateData,
        target_amount:
          updateData.target_amount !== undefined ? cents(updateData.target_amount) : atual.target_amount,
        current_amount:
          updateData.current_amount !== undefined ? cents(updateData.current_amount) : atual.current_amount,
      })
      await this.persist()
      return this.goals[index]
    },

    async updateGoalProgress({ id, amount }) {
      const goal = this.getGoalById(id)
      if (!goal) return null
      const current = cents((goal.current_amount || 0) + (amount || 0))
      return this.updateGoal({ id, current_amount: current, achieved: current >= (goal.target_amount || 0) })
    },

    async deleteGoal(id) {
      this.goals = this.goals.filter((g) => g.id !== id)
      await this.persist()
      return true
    },

    async toggleGoalStatus(id) {
      const goal = this.getGoalById(id)
      if (!goal) return null
      return this.updateGoal({ id, achieved: !goal.achieved })
    },
  },
})
