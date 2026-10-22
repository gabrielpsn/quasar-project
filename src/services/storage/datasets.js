/**
 * Registro de datasets (arquivos .txt) do aplicativo.
 *
 * Cada dataset é gravado em um arquivo `.txt` próprio, dentro da mesma pasta
 * escolhida pelo usuário (File System Access API) ou na raiz do OPFS.
 *
 * Formato do arquivo:
 *   # finance-app/<arquivo>
 *   # schema: <versão>
 *   # updatedAt: <ISO>
 *   { ...json... }
 */

export const STORAGE_FORMAT_VERSION = 1

export const DATASETS = {
  profile: {
    file: 'perfil.txt',
    title: 'Perfil e acesso',
    description: 'Nome, e-mail, preferências de usuário e protections de senha.',
    schema: 1,
  },
  plan: {
    file: 'fluxo-caixa.txt',
    title: 'Fluxo de caixa',
    description: 'Meses planejados, entradas por dia, lançamentos e status de pagamento.',
    schema: 2,
  },
  cards: {
    file: 'cartoes.txt',
    title: 'Cartões de crédito',
    description: 'Cartões cadastrados, limites, fechamento e vencimento.',
    schema: 1,
  },
  debts: {
    file: 'dividas.txt',
    title: 'Dívidas',
    description: 'Empréstimos, financiamentos, saldos devedores e taxas.',
    schema: 1,
  },
  investments: {
    file: 'investimentos.txt',
    title: 'Investimentos',
    description: 'Carteira de FIIs, renda fixa, preços médios e dividendos.',
    schema: 1,
  },
  goals: {
    file: 'metas.txt',
    title: 'Metas',
    description: 'Metas financeiras, aportes planejados e progresso.',
    schema: 1,
  },
  assets: {
    file: 'patrimonio.txt',
    title: 'Patrimônio',
    description: 'Ativos, passivos e snapshots do patrimônio líquido.',
    schema: 1,
  },
  settings: {
    file: 'preferencias.txt',
    title: 'Preferências',
    description: 'Categorias, recorrências, metas de reserva e ajustes do app.',
    schema: 1,
  },
  history: {
    file: 'historico.txt',
    title: 'Histórico',
    description: 'Journal append-only (NDJSON) com as alterações realizadas.',
    schema: 1,
    appendOnly: true,
  },
}

export const DATASET_KEYS = Object.keys(DATASETS)

export function datasetFile(key) {
  return DATASETS[key]?.file || `${key}.txt`
}

export function datasetMeta(key) {
  return DATASETS[key] || null
}

/**
 * Extensão usada nos backups rotativos: `fluxo-caixa.txt` -> `fluxo-caixa.bak1.txt`
 */
export function backupFileName(file, slot) {
  const base = file.replace(/\.txt$/, '')
  return `${base}.bak${slot}.txt`
}

export const BACKUP_SLOTS = 3
