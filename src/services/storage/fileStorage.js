import { DATASETS, DATASET_KEYS, datasetFile, backupFileName, BACKUP_SLOTS } from './datasets'
import { serializeFile, parseFile, serializeNdjson, parseNdjson, serializeBundle, parseBundle } from './fileFormat'
import { migrate } from './migrations'
import { defaultFor } from './schemas'
import { createFsaAdapter } from './adapters/fsaAdapter'
import { createOpfsAdapter } from './adapters/opfsAdapter'
import { createLocalAdapter } from './adapters/localAdapter'

export class StorageError extends Error {
  constructor(message, code = 'storage_error') {
    super(message)
    this.name = 'StorageError'
    this.code = code
  }
}

const DEBOUNCE_MS = 800

const state = {
  fsa: null,
  adapter: null,
  mode: 'local',
  ready: false,
  needsPermission: false,
  error: null,
  lastSavedAt: null,
  savingDatasets: new Set(),
  files: {},
}

const cache = new Map()
const dirty = new Set()
const timers = new Map()
const queues = new Map()
const lastWritten = new Map()
const listeners = new Set()

function notify() {
  const snapshot = { ...state, savingDatasets: [...state.savingDatasets] }
  listeners.forEach((fn) => {
    try {
      fn(snapshot)
    } catch {
      /* listener não deve derrubar a aplicação */
    }
  })
}

function serialize(datasetKey, data) {
  const meta = DATASETS[datasetKey]
  if (!meta) throw new StorageError(`Dataset desconhecido: ${datasetKey}`, 'unknown_dataset')

  if (meta.appendOnly) {
    return serializeNdjson(meta.file, meta.schema, Array.isArray(data) ? data : [])
  }
  return serializeFile(datasetKey, meta.file, meta.schema, data)
}

function deserialize(datasetKey, raw) {
  const meta = DATASETS[datasetKey]
  if (!meta) throw new StorageError(`Dataset desconhecido: ${datasetKey}`, 'unknown_dataset')

  if (meta.appendOnly) {
    const parsed = parseNdjson(raw)
    return { data: parsed.rows, meta: parsed }
  }

  const parsed = parseFile(raw)
  if (!parsed) return { data: null, meta: null }
  return { data: parsed.data, meta: parsed }
}

/**
 * Fila de escrita por dataset: garante que duas gravações do mesmo arquivo
 * nunca ocorram em paralelo.
 */
function enqueue(datasetKey, task) {
  const previous = queues.get(datasetKey) || Promise.resolve()
  const next = previous.then(task, task)
  queues.set(
    datasetKey,
    next.catch(() => {})
  )
  return next
}

async function rotateBackup(file) {
  const existing = await state.adapter.read(file)
  if (existing === null) return

  for (let slot = BACKUP_SLOTS - 1; slot >= 1; slot--) {
    const from = backupFileName(file, slot)
    const to = backupFileName(file, slot + 1)
    const content = await state.adapter.read(from)
    if (content !== null) {
      await state.adapter.write(to, content)
      await state.adapter.remove(from)
    }
  }

  await state.adapter.write(backupFileName(file, 1), existing)
}

async function writeDataset(datasetKey, data) {
  const meta = DATASETS[datasetKey]
  const file = meta.file
  const content = serialize(datasetKey, data)

  if (lastWritten.get(file) === content) return false

  state.savingDatasets.add(datasetKey)
  notify()

  try {
    await rotateBackup(file)
    await state.adapter.write(file, content)
    lastWritten.set(file, content)
    state.lastSavedAt = new Date().toISOString()
    state.error = null
    return true
  } finally {
    state.savingDatasets.delete(datasetKey)
    notify()
  }
}

function assertReady() {
  if (!state.adapter) throw new StorageError('Armazenamento não inicializado.', 'not_ready')
  if (!state.ready) {
    throw new StorageError(
      'Sem acesso ao armazenamento. Reconecte a pasta de dados para continuar.',
      'permission_required'
    )
  }
}

async function selectAdapter() {
  if (state.fsa === null) {
    state.fsa = createFsaAdapter()
  }

  if (state.fsa.available) {
    const restored = await state.fsa.init()
    if (restored) {
      state.adapter = state.fsa
      state.mode = 'fsa'
      state.ready = state.fsa.ready
      state.needsPermission = state.fsa.needsPermission
      return
    }
  }

  const opfs = createOpfsAdapter()
  const root = await opfs.init()
  if (root) {
    state.adapter = opfs
    state.mode = 'opfs'
    state.ready = true
    state.needsPermission = false
    return
  }

  const local = createLocalAdapter()
  await local.init()
  state.adapter = local
  state.mode = 'local'
  state.ready = true
  state.needsPermission = false
}

export const fileStorage = {
  async init() {
    try {
      await selectAdapter()
    } catch (error) {
      state.error = error.message
      const local = createLocalAdapter()
      await local.init()
      state.adapter = local
      state.mode = 'local'
      state.ready = true
    }
    await this.refreshFiles()
    notify()
    return this.status()
  },

  status() {
    return {
      mode: state.mode,
      ready: state.ready,
      needsPermission: state.needsPermission,
      error: state.error,
      lastSavedAt: state.lastSavedAt,
      label: state.adapter?.label || 'Desconhecido',
      description: state.adapter?.description || '',
      directoryName: state.adapter?.directoryName || null,
      supportsDirectoryPicker: !!state.adapter?.supportsDirectoryPicker,
      saving: state.savingDatasets.size > 0,
      files: { ...state.files },
    }
  },

  subscribe(fn) {
    listeners.add(fn)
    fn(this.status())
    return () => listeners.delete(fn)
  },

  async refreshFiles() {
    if (!state.adapter) return {}
    try {
      const names = await state.adapter.list()
      const files = {}
      for (const name of names) {
        const stat = await state.adapter.stat(name)
        files[name] = stat || { size: 0, lastModified: null }
      }
      state.files = files
    } catch {
      /* ignora falhas de listagem */
    }
    return state.files
  },

  /**
   * Conecta (ou troca) a pasta de dados do usuário.
   * Exige gesto do usuário — deve ser chamado a partir de um click.
   */
  async pickLocation() {
    if (!state.fsa?.available) {
      throw new StorageError(
        'Este navegador não permite escolher pasta. Os dados continuarão no armazenamento interno.',
        'unsupported'
      )
    }

    const previous = state.adapter

    await state.fsa.pick()

    state.adapter = state.fsa
    state.mode = 'fsa'
    state.ready = true
    state.needsPermission = false
    state.error = null
    lastWritten.clear()

    // Migra o que já existia no armazenamento anterior para a nova pasta.
    if (previous && previous.id !== 'fsa') {
      for (const key of DATASET_KEYS) {
        const raw = await previous.read(datasetFile(key))
        if (!raw) continue
        const { data } = deserialize(key, raw)
        if (data === null) continue
        cache.set(key, data)
        dirty.add(key)
        await this.flushDataset(key)
      }
    }

    await this.refreshFiles()
    notify()
    return this.status()
  },

  async requestPermission() {
    if (!state.adapter?.requestPermission) return false
    const result = await state.adapter.requestPermission()
    state.ready = state.adapter.ready
    state.needsPermission = state.adapter.needsPermission
    notify()
    return result
  },

  /**
   * Lê um dataset do disco aplicando migrações de schema.
   * Se houver escrita pendente em memória, ela é a fonte da verdade.
   */
  async load(datasetKey) {
    if (!DATASETS[datasetKey]) throw new StorageError(`Dataset desconhecido: ${datasetKey}`, 'unknown_dataset')
    assertReady()

    if (dirty.has(datasetKey) && cache.has(datasetKey)) {
      return {
        data: cache.get(datasetKey),
        meta: { schema: DATASETS[datasetKey].schema, updatedAt: null },
      }
    }

    const file = datasetFile(datasetKey)
    const raw = await state.adapter.read(file)
    const { data, meta } = deserialize(datasetKey, raw)

    if (data === null) {
      cache.delete(datasetKey)
      return { data: null, meta: null }
    }

    const target = DATASETS[datasetKey].schema
    let finalData = data
    let finalSchema = meta?.schema || 1

    if (finalSchema < target) {
      const result = migrate(datasetKey, finalData, finalSchema)
      finalData = result.data
      finalSchema = result.schema
    }

    cache.set(datasetKey, finalData)
    lastWritten.set(file, serialize(datasetKey, finalData))
    return { data: finalData, meta: { ...meta, schema: finalSchema } }
  },

  async loadAll() {
    const result = {}
    for (const key of DATASET_KEYS) {
      try {
        const { data } = await this.load(key)
        result[key] = data
      } catch (error) {
        result[key] = null
        if (!state.error) state.error = error.message
      }
    }
    return result
  },

  /**
   * Grava um dataset. A escrita é debounced; use `flush` para forçar.
   */
  save(datasetKey, data, { immediate = false } = {}) {
    if (!DATASETS[datasetKey]) throw new StorageError(`Dataset desconhecido: ${datasetKey}`, 'unknown_dataset')
    cache.set(datasetKey, data)
    dirty.add(datasetKey)

    if (immediate) return this.flushDataset(datasetKey)

    if (!timers.has(datasetKey)) {
      const timer = setTimeout(() => {
        timers.delete(datasetKey)
        this.flushDataset(datasetKey)
      }, DEBOUNCE_MS)
      timers.set(datasetKey, timer)
    }

    return Promise.resolve(true)
  },

  async flushDataset(datasetKey) {
    if (!dirty.has(datasetKey)) return false
    dirty.delete(datasetKey)

    const timer = timers.get(datasetKey)
    if (timer) {
      clearTimeout(timer)
      timers.delete(datasetKey)
    }

    const data = cache.get(datasetKey)
    if (data === undefined) return false

    try {
      assertReady()
      const written = await enqueue(datasetKey, () => writeDataset(datasetKey, data))
      await this.refreshFiles()
      return written
    } catch (error) {
      state.error = error.message
      dirty.add(datasetKey)
      notify()
      throw error
    }
  },

  async flush() {
    const pending = [...dirty]
    for (const key of pending) {
      await this.flushDataset(key)
    }
    return pending.length
  },

  /**
   * Cria no disco os arquivos `.txt` que ainda não existem, usando os
   * valores padrão (seed). Idempotente: nunca sobrescreve dados do usuário.
   */
  async seedMissing() {
    assertReady()
    const criados = []

    for (const key of DATASET_KEYS) {
      try {
        const raw = await state.adapter.read(datasetFile(key))
        if (raw !== null && raw !== undefined && String(raw).trim() !== '') continue

        const data = defaultFor(key)
        if (data === null) continue

        cache.set(key, data)
        dirty.add(key)
        await this.flushDataset(key)
        criados.push(key)
      } catch {
        /* arquivo ilegível: tenta semear na próxima inicialização */
      }
    }

    if (criados.length) await this.refreshFiles()
    notify()
    return criados
  },

  get pending() {
    return [...dirty]
  },

  /**
   * Exporta todos os datasets em um único arquivo `.txt`.
   */
  async exportBundle() {
    assertReady()
    const datasets = []

    for (const key of DATASET_KEYS) {
      let data = cache.get(key)
      if (data === undefined) {
        const loaded = await this.load(key)
        data = loaded.data
      }
      datasets.push({ key, file: DATASETS[key].file, data: data ?? null })
    }

    const content = serializeBundle(datasets)
    const stamp = new Date().toISOString().slice(0, 10)
    downloadText(`finance-app-backup-${stamp}.txt`, content)
    return content.length
  },

  /**
   * Importa um bundle `.txt` gerado por `exportBundle`.
   */
  async importBundle(file) {
    const text = await file.text()
    const bundle = parseBundle(text)

    if (!bundle.datasets.length) {
      throw new StorageError('Arquivo de backup inválido ou vazio.', 'invalid_bundle')
    }

    for (const entry of bundle.datasets) {
      if (!DATASETS[entry.key]) continue
      const { data } = deserialize(entry.key, entry.data === null ? null : JSON.stringify(entry.data))
      if (data === null) continue
      cache.set(entry.key, data)
      dirty.add(entry.key)
      await this.flushDataset(entry.key)
    }

    await this.refreshFiles()
    notify()
    return bundle.datasets.length
  },

  /**
   * Remove todos os arquivos de dados do armazenamento ativo.
   */
  async reset() {
    assertReady()
    for (const key of DATASET_KEYS) {
      const file = datasetFile(key)
      await state.adapter.remove(file)
      for (let slot = 1; slot <= BACKUP_SLOTS; slot++) {
        await state.adapter.remove(backupFileName(file, slot))
      }
    }
    cache.clear()
    dirty.clear()
    lastWritten.clear()
    await this.refreshFiles()
    notify()
  },
}

export function downloadText(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export { DATASETS, DATASET_KEYS, datasetFile }
