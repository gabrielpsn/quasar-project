import { defineStore } from 'pinia';
import { api } from 'src/services/api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('token') || null,
    isAuthenticated: !!localStorage.getItem('token'),
  }),

  getters: {
    isLoggedIn: (state) => state.isAuthenticated,
    currentUser: (state) => state.user,
  },

  actions: {
    async login(credentials) {
      try {
        const response = await api.post('/users/login', credentials);
        const { token, user } = response;
        
        this.token = token;
        this.user = user;
        this.isAuthenticated = true;
        
        // Store token in localStorage
        localStorage.setItem('token', token);
        
        return { success: true };
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    },

    async register(userData) {
      try {
        const response = await api.post('/users/register', userData);
        const { token, user } = response;
        
        this.token = token;
        this.user = user;
        this.isAuthenticated = true;
        
        // Store token in localStorage
        localStorage.setItem('token', token);
        
        return { success: true };
      } catch (error) {
        console.error('Registration error:', error);
        throw error;
      }
    },

    async fetchUser() {
      try {
        if (!this.token) return;
        
        const response = await api.get('/users/me');
        this.user = response;
        return response;
      } catch (error) {
        console.error('Failed to fetch user:', error);
        this.logout();
        throw error;
      }
    },

    logout() {
      this.user = null;
      this.token = null;
      this.isAuthenticated = false;
      
      // Remove token from localStorage
      localStorage.removeItem('token');
      
      // Redirect to login page
      if (this.router) {
        this.router.push('/login');
      }
    },

    setRouter(router) {
      this.router = router;
    },
  },
});
