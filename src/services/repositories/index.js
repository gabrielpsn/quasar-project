import { fileStorage } from 'src/services/storage/fileStorage'
import { defaultFor, normalize } from 'src/services/storage/schemas'

/**
 * Cria um repositório para um dataset.
 * Toda a aplicação lê e grava exclusivamente por aqui — nenhum componente
 * toca o `fileStorage` diretamente.
 */
export function createRepository(datasetKey) {
  return {
    datasetKey,

    async load() {
      const { data } = await fileStorage.load(datasetKey)
      if (data === null) return defaultFor(datasetKey)
      return normalize(datasetKey, data)
    },

    async save(data, options = {}) {
      return fileStorage.save(datasetKey, normalize(datasetKey, data), options)
    },

    async saveNow(data) {
      return fileStorage.save(datasetKey, normalize(datasetKey, data), { immediate: true })
    },
  }
}

export const profileRepo = createRepository('profile')
export const planRepo = createRepository('plan')
export const cardsRepo = createRepository('cards')
export const debtsRepo = createRepository('debts')
export const investmentsRepo = createRepository('investments')
export const goalsRepo = createRepository('goals')
export const assetsRepo = createRepository('assets')
export const settingsRepo = createRepository('settings')
export const historyRepo = createRepository('history')
