import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';

export const useTransactionStore = defineStore('transactions', {
  state: () => ({
    transactions: [],
    loading: false,
    error: null
  }),

  getters: {
    recentTransactions: (state) => {
      return [...state.transactions]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
    },
    
    monthlyTransactions: (state) => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      return state.transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return (
          transactionDate.getMonth() === currentMonth &&
          transactionDate.getFullYear() === currentYear
        );
      });
    },
    
    monthlyIncome: (state) => {
      return state.transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    },
    
    monthlyExpenses: (state) => {
      return state.transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    },
    
    totalBalance: (state) => {
      let balance = 0;
      state.transactions.forEach(transaction => {
        const amount = parseFloat(transaction.amount);
        balance += transaction.type === 'income' ? amount : -amount;
      });
      return balance;
    }
  },

  actions: {
    async fetchTransactions() {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.get('/api/transactions');
        this.transactions = response.data || [];
        return this.transactions;
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to fetch transactions';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async fetchRecentTransactions(limit = 5) {
      try {
        const response = await api.get('/api/transactions', {
          params: { limit, sort: '-date' }
        });
        return response.data || [];
      } catch (error) {
        console.error('Error fetching recent transactions:', error);
        return [];
      }
    },
    
    async getTransactionById(id) {
      try {
        const response = await api.get(`/api/transactions/${id}`);
        return response.data;
      } catch (error) {
        console.error(`Error fetching transaction ${id}:`, error);
        throw error;
      }
    },
    
    async createTransaction(transactionData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.post('/api/transactions', transactionData);
        this.transactions.unshift(response.data);
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to create transaction';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async updateTransaction({ id, ...updateData }) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.put(`/api/transactions/${id}`, updateData);
        const index = this.transactions.findIndex(t => t.id === id);
        if (index !== -1) {
          this.transactions.splice(index, 1, response.data);
        }
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to update transaction';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async deleteTransaction(id) {
      this.loading = true;
      this.error = null;
      try {
        await api.delete(`/api/transactions/${id}`);
        this.transactions = this.transactions.filter(t => t.id !== id);
        return true;
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to delete transaction';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async getCategorySpending() {
      try {
        const response = await api.get('/api/transactions/category-spending');
        return response.data || [];
      } catch (error) {
        console.error('Error fetching category spending:', error);
        return [];
      }
    },
    
    async getTransactionsByDateRange(startDate, endDate) {
      try {
        const response = await api.get('/api/transactions', {
          params: { startDate, endDate }
        });
        return response.data || [];
      } catch (error) {
        console.error('Error fetching transactions by date range:', error);
        return [];
      }
    }
  }
});
