import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';

export const useGoalStore = defineStore('goals', {
  state: () => ({
    goals: [],
    loading: false,
    error: null
  }),

  getters: {
    activeGoals: (state) => {
      return state.goals.filter(goal => !goal.achieved);
    },
    
    completedGoals: (state) => {
      return state.goals.filter(goal => goal.achieved);
    },
    
    goalsByProgress: (state) => {
      return [...state.goals].sort((a, b) => {
        const progressA = a.current_amount / a.target_amount;
        const progressB = b.current_amount / b.target_amount;
        return progressB - progressA;
      });
    }
  },

  actions: {
    async fetchGoals() {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.get('/api/goals');
        this.goals = response.data || [];
        return this.goals;
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to fetch goals';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async getGoalById(id) {
      try {
        const response = await api.get(`/api/goals/${id}`);
        return response.data;
      } catch (error) {
        console.error(`Error fetching goal ${id}:`, error);
        throw error;
      }
    },
    
    async createGoal(goalData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.post('/api/goals', goalData);
        this.goals.push(response.data);
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to create goal';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async updateGoal({ id, ...updateData }) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.put(`/api/goals/${id}`, updateData);
        const index = this.goals.findIndex(g => g.id === id);
        if (index !== -1) {
          this.goals.splice(index, 1, response.data);
        }
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to update goal';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async updateGoalProgress({ id, amount }) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.put(`/api/goals/${id}/progress`, { amount });
        const index = this.goals.findIndex(g => g.id === id);
        if (index !== -1) {
          this.goals.splice(index, 1, response.data);
        }
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to update goal progress';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async deleteGoal(id) {
      this.loading = true;
      this.error = null;
      try {
        await api.delete(`/api/goals/${id}`);
        this.goals = this.goals.filter(goal => goal.id !== id);
        return true;
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to delete goal';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async toggleGoalStatus(id) {
      const goal = this.goals.find(g => g.id === id);
      if (!goal) return;
      
      try {
        const updatedGoal = await this.updateGoal({
          id,
          achieved: !goal.achieved
        });
        return updatedGoal;
      } catch (error) {
        console.error('Error toggling goal status:', error);
        throw error;
      }
    }
  }
});
