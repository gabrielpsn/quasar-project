import { defineStore } from 'pinia'
import { fileStorage, StorageError } from 'src/services/storage/fileStorage'

export const useStorageStore = defineStore('storage', {
  state: () => ({
    mode: 'local',
    ready: false,
    needsPermission: false,
    error: null,
    lastSavedAt: null,
    label: 'Inicializando...',
    description: '',
    directoryName: null,
    supportsDirectoryPicker: false,
    saving: false,
    files: {},
    initialized: false,
    busy: false,
  }),

  getters: {
    isLocalDisk: (state) => state.mode === 'fsa',
    isSandbox: (state) => state.mode === 'opfs',
    modeLabel: (state) => {
      if (state.mode === 'fsa') return 'Pasta local do computador'
      if (state.mode === 'opfs') return 'Armazenamento privado do navegador'
      return 'Memória do navegador'
    },
    modeIcon: (state) => {
      if (state.mode === 'fsa') return 'folder'
      if (state.mode === 'opfs') return 'shield'
      return 'memory'
    },
    fileList: (state) =>
      Object.entries(state.files)
        .map(([name, info]) => ({ name, ...info }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  },

  actions: {
    applyStatus(status) {
      this.mode = status.mode
      this.ready = status.ready
      this.needsPermission = status.needsPermission
      this.error = status.error
      this.lastSavedAt = status.lastSavedAt
      this.label = status.label
      this.description = status.description
      this.directoryName = status.directoryName
      this.supportsDirectoryPicker = status.supportsDirectoryPicker
      this.saving = status.saving
      this.files = status.files || {}
    },

    async init() {
      if (this.initialized) return this.$state
      const status = await fileStorage.init()
      this.applyStatus(status)
      this.initialized = true
      fileStorage.subscribe((next) => this.applyStatus(next))
      return status
    },

    async pickLocation() {
      this.busy = true
      this.error = null
      try {
        const status = await fileStorage.pickLocation()
        this.applyStatus(status)
        return status
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.busy = false
      }
    },

    async requestPermission() {
      this.busy = true
      try {
        const result = await fileStorage.requestPermission()
        this.applyStatus(fileStorage.status())
        return result === 'granted'
      } finally {
        this.busy = false
      }
    },

    async exportBundle() {
      this.busy = true
      try {
        return await fileStorage.exportBundle()
      } finally {
        this.busy = false
      }
    },

    async importBundle(file) {
      this.busy = true
      this.error = null
      try {
        return await fileStorage.importBundle(file)
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.busy = false
      }
    },

    async reset() {
      this.busy = true
      try {
        await fileStorage.reset()
      } finally {
        this.busy = false
      }
    },

    async flush() {
      await fileStorage.flush()
    },

    async seedMissing() {
      const criados = await fileStorage.seedMissing()
      this.applyStatus(fileStorage.status())
      return criados
    },

    isStorageError(error) {
      return error instanceof StorageError
    },
  },
})
