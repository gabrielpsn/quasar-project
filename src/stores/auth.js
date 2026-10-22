import { defineStore } from 'pinia'
import { profileRepo } from 'src/services/repositories'
import { createPassword, verifyPassword } from 'src/services/crypto/password'
import { nowISO } from 'src/utils/dates'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    isAuthenticated: false,
    needsPassword: false,
    loading: false,
    error: null,
    initialized: false,
  }),

  getters: {
    isLoggedIn: (state) => state.isAuthenticated,
    currentUser: (state) => state.user,
    displayName: (state) => state.user?.nome || 'Usuário',
    initials: (state) => {
      const nome = state.user?.nome || ''
      if (!nome.trim()) return 'U'
      return nome
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    },
  },

  actions: {
    /**
     * Carrega o perfil local. Sem senha configurada o app entra direto;
     * com senha configurada, exige desbloqueio.
     */
    async init() {
      if (this.initialized) return
      this.loading = true
      try {
        const profile = await profileRepo.load()
        this.user = { nome: profile.nome || '', email: profile.email || '' }
        this.needsPassword = !!profile.senhaHash
        this.isAuthenticated = !this.needsPassword
        this.initialized = true
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async register({ nome, email, password }) {
      this.loading = true
      this.error = null
      try {
        const current = await profileRepo.load()
        const profile = {
          ...current,
          nome: nome || current.nome || '',
          email: email || current.email || '',
          criadoEm: current.criadoEm || nowISO(),
          ultimoAcesso: nowISO(),
        }

        if (password) {
          const { hash, salt } = await createPassword(password)
          profile.senhaHash = hash
          profile.salt = salt
          profile.definirSenhaEm = nowISO()
        } else {
          profile.senhaHash = null
          profile.salt = null
        }

        await profileRepo.saveNow(profile)
        this.user = { nome: profile.nome, email: profile.email }
        this.needsPassword = !!profile.senhaHash
        this.isAuthenticated = true
        this.initialized = true
        return { success: true }
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async login(password) {
      this.loading = true
      this.error = null
      try {
        const profile = await profileRepo.load()
        if (!profile.senhaHash) {
          this.isAuthenticated = true
          return { success: true }
        }

        const ok = await verifyPassword(password, profile.senhaHash, profile.salt)
        if (!ok) {
          this.error = 'Senha incorreta.'
          throw new Error(this.error)
        }

        profile.ultimoAcesso = nowISO()
        await profileRepo.saveNow(profile)
        this.user = { nome: profile.nome, email: profile.email }
        this.isAuthenticated = true
        return { success: true }
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async saveProfile(patch) {
      const current = await profileRepo.load()
      const profile = { ...current, ...patch }
      await profileRepo.saveNow(profile)
      this.user = { nome: profile.nome, email: profile.email }
      return profile
    },

    async changePassword(atual, nova) {
      const current = await profileRepo.load()
      if (current.senhaHash) {
        const ok = await verifyPassword(atual, current.senhaHash, current.salt)
        if (!ok) throw new Error('Senha atual incorreta.')
      }
      const { hash, salt } = await createPassword(nova)
      current.senhaHash = hash
      current.salt = salt
      current.definirSenhaEm = nowISO()
      await profileRepo.saveNow(current)
      this.needsPassword = true
      return true
    },

    async removePassword() {
      const current = await profileRepo.load()
      current.senhaHash = null
      current.salt = null
      await profileRepo.saveNow(current)
      this.needsPassword = false
      this.isAuthenticated = true
      return true
    },

    logout() {
      this.isAuthenticated = false
    },
  },
})
