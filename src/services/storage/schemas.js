import {
  seedPlan,
  seedInvestments,
  seedSettings,
  seedCards,
  seedDebts,
} from 'src/services/seed/defaultData'

/**
 * Valores padrão (e estrutura de fallback) de cada dataset.
 * Usados quando o arquivo ainda não existe no armazenamento.
 */
export const DEFAULTS = {
  profile: () => ({
    nome: '',
    email: '',
    senhaHash: null,
    salt: null,
    criadoEm: null,
    ultimoAcesso: null,
  }),
  plan: () => seedPlan(),
  cards: () => seedCards(),
  debts: () => seedDebts(),
  investments: () => seedInvestments(),
  goals: () => [],
  assets: () => ({ ativos: [], passivos: [], snapshots: [] }),
  settings: () => seedSettings(),
  history: () => [],
}

export function defaultFor(datasetKey) {
  const factory = DEFAULTS[datasetKey]
  return factory ? factory() : null
}

/**
 * Validação leve: garante que o payload carregado do disco tenha a forma
 * esperada antes de entrar na aplicação.
 */
export function normalize(datasetKey, data) {
  if (data === null || data === undefined) return defaultFor(datasetKey)

  switch (datasetKey) {
    case 'plan':
      return Array.isArray(data.meses) ? data : defaultFor('plan')
    case 'cards':
    case 'debts':
    case 'investments':
    case 'goals':
      return Array.isArray(data) ? data : defaultFor(datasetKey)
    case 'assets':
      return {
        ativos: Array.isArray(data.ativos) ? data.ativos : [],
        passivos: Array.isArray(data.passivos) ? data.passivos : [],
        snapshots: Array.isArray(data.snapshots) ? data.snapshots : [],
      }
    case 'settings':
      return { ...defaultFor('settings'), ...data }
    case 'history':
      return Array.isArray(data) ? data : []
    case 'profile':
      return { ...defaultFor('profile'), ...data }
    default:
      return data
  }
}
