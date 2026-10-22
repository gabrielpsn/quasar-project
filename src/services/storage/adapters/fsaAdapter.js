import { idbGet, idbSet, idbDelete } from '../idb'

const HANDLE_KEY = 'fsa-directory'

/**
 * Adaptador baseado na File System Access API.
 * Grava arquivos `.txt` reais na pasta escolhida pelo usuário.
 */
export function createFsaAdapter() {
  let dirHandle = null
  let permission = 'unknown'

  const hasSupport =
    typeof window !== 'undefined' &&
    typeof window.showDirectoryPicker === 'function' &&
    typeof window.FileSystemFileHandle !== 'undefined'

  async function ensurePermission(request = false) {
    if (!dirHandle) return 'denied'
    const opts = { mode: 'readwrite' }
    if (!request) {
      const current = await dirHandle.queryPermission(opts)
      permission = current
      return current
    }
    const current = await dirHandle.requestPermission(opts)
    permission = current
    return current
  }

  async function restore() {
    if (!hasSupport) return null
    try {
      const handle = await idbGet(HANDLE_KEY)
      if (!handle) return null
      dirHandle = handle
      permission = await ensurePermission(false)
      return dirHandle
    } catch {
      return null
    }
  }

  async function pick() {
    if (!hasSupport) throw new Error('Navegador sem suporte a File System Access API.')
    const handle = await window.showDirectoryPicker({ id: 'finance-app-data', mode: 'readwrite' })
    dirHandle = handle
    permission = 'granted'
    try {
      await idbSet(HANDLE_KEY, handle)
    } catch {
      /* handle não persistido: o usuário precisará reconectar */
    }
    return dirHandle
  }

  async function forget() {
    dirHandle = null
    permission = 'unknown'
    try {
      await idbDelete(HANDLE_KEY)
    } catch {
      /* ignore */
    }
  }

  async function list() {
    if (!dirHandle) return []
    const names = []
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') names.push(entry.name)
    }
    return names.sort()
  }

  async function read(file) {
    if (!dirHandle) return null
    try {
      const handle = await dirHandle.getFileHandle(file)
      const blob = await handle.getFile()
      return await blob.text()
    } catch {
      return null
    }
  }

  async function write(file, content) {
    if (!dirHandle) throw new Error('Pasta de dados não conectada.')
    const state = await ensurePermission(false)
    if (state !== 'granted') {
      const asked = await ensurePermission(true)
      if (asked !== 'granted') throw new Error('Permissão de escrita negada.')
    }
    const handle = await dirHandle.getFileHandle(file, { create: true })
    const writable = await handle.createWritable()
    try {
      await writable.write(content)
      await writable.close()
    } catch (error) {
      try {
        await writable.abort()
      } catch {
        /* ignore */
      }
      throw error
    }
  }

  async function remove(file) {
    if (!dirHandle) return false
    try {
      await dirHandle.removeEntry(file)
      return true
    } catch {
      return false
    }
  }

  async function stat(file) {
    if (!dirHandle) return null
    try {
      const handle = await dirHandle.getFileHandle(file)
      const blob = await handle.getFile()
      return { size: blob.size, lastModified: blob.lastModified }
    } catch {
      return null
    }
  }

  return {
    id: 'fsa',
    kind: 'disk',
    label: 'Pasta local (File System Access)',
    description: 'Grava os arquivos .txt diretamente na pasta escolhida no seu computador.',
    supportsDirectoryPicker: true,
    get available() {
      return hasSupport
    },
    get ready() {
      return !!dirHandle && permission === 'granted'
    },
    get needsPermission() {
      return !!dirHandle && permission !== 'granted'
    },
    get directoryName() {
      return dirHandle ? dirHandle.name : null
    },
    get permission() {
      return permission
    },
    init: restore,
    pick,
    forget,
    requestPermission: () => ensurePermission(true),
    list,
    read,
    write,
    remove,
    stat,
  }
}
