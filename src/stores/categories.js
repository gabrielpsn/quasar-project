import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';

export const useCategoryStore = defineStore('categories', {
  state: () => ({
    categories: [],
    loading: false,
    error: null
  }),

  getters: {
    expenseCategories: (state) => {
      return state.categories.filter(category => category.type === 'expense');
    },
    
    incomeCategories: (state) => {
      return state.categories.filter(category => category.type === 'income');
    },
    
    categoryOptions: (state) => {
      return state.categories.map(category => ({
        label: category.name,
        value: category.id,
        color: category.color,
        icon: category.icon,
        type: category.type
      }));
    }
  },

  actions: {
    async fetchCategories() {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.get('/api/categories');
        this.categories = response.data || [];
        return this.categories;
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to fetch categories';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async getCategoryById(id) {
      try {
        const response = await api.get(`/api/categories/${id}`);
        return response.data;
      } catch (error) {
        console.error(`Error fetching category ${id}:`, error);
        throw error;
      }
    },
    
    async createCategory(categoryData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.post('/api/categories', categoryData);
        this.categories.push(response.data);
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to create category';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async updateCategory({ id, ...updateData }) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.put(`/api/categories/${id}`, updateData);
        const index = this.categories.findIndex(c => c.id === id);
        if (index !== -1) {
          this.categories.splice(index, 1, response.data);
        }
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to update category';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async deleteCategory(id) {
      this.loading = true;
      this.error = null;
      try {
        await api.delete(`/api/categories/${id}`);
        this.categories = this.categories.filter(category => category.id !== id);
        return true;
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to delete category';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    getCategoryName(id) {
      const category = this.categories.find(c => c.id === id);
      return category ? category.name : 'Uncategorized';
    },
    
    // Helper method to get default categories for initial setup
    getDefaultCategories() {
      return [
        // Expense categories
        { name: 'Food & Drinks', type: 'expense', color: 'red', icon: 'restaurant' },
        { name: 'Shopping', type: 'expense', color: 'blue', icon: 'shopping_cart' },
        { name: 'Transportation', type: 'expense', color: 'green', icon: 'directions_car' },
        { name: 'Housing', type: 'expense', color: 'orange', icon: 'home' },
        { name: 'Utilities', type: 'expense', color: 'purple', icon: 'flash_on' },
        { name: 'Entertainment', type: 'expense', color: 'pink', icon: 'movie' },
        { name: 'Healthcare', type: 'expense', color: 'teal', icon: 'favorite' },
        { name: 'Education', type: 'expense', color: 'indigo', icon: 'school' },
        
        // Income categories
        { name: 'Salary', type: 'income', color: 'green', icon: 'account_balance' },
        { name: 'Freelance', type: 'income', color: 'light-green', icon: 'work' },
        { name: 'Investment', type: 'income', color: 'blue-grey', icon: 'trending_up' },
        { name: 'Gift', type: 'income', color: 'pink', icon: 'card_giftcard' },
        { name: 'Other', type: 'income', color: 'grey', icon: 'more_horiz' }
      ];
    },
    
    // Initialize default categories if none exist
    async initializeDefaultCategories() {
      if (this.categories.length === 0) {
        try {
          const defaultCategories = this.getDefaultCategories();
          for (const category of defaultCategories) {
            await this.createCategory(category);
          }
        } catch (error) {
          console.error('Error initializing default categories:', error);
        }
      }
    }
  }
});
