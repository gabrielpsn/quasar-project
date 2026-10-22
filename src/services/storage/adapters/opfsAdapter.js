const ROOT_DIR = 'finance-app'

/**
 * Adaptador baseado no OPFS (Origin Private File System).
 * Grava arquivos `.txt` reais no sistema de arquivos privado do navegador,
 * disponível em Chrome, Edge, Firefox (111+) e Safari (15.2+).
 */
export function createOpfsAdapter() {
  let root = null
  let ready = false

  const hasSupport =
    typeof navigator !== 'undefined' &&
    !!navigator.storage &&
    typeof navigator.storage.getDirectory === 'function'

  async function init() {
    if (!hasSupport) return null
    try {
      const base = await navigator.storage.getDirectory()
      root = await base.getDirectoryHandle(ROOT_DIR, { create: true })
      ready = true
      return root
    } catch {
      root = null
      ready = false
      return null
    }
  }

  async function list() {
    if (!root) return []
    const names = []
    for await (const entry of root.values()) {
      if (entry.kind === 'file') names.push(entry.name)
    }
    return names.sort()
  }

  async function read(file) {
    if (!root) return null
    try {
      const handle = await root.getFileHandle(file)
      const blob = await handle.getFile()
      return await blob.text()
    } catch {
      return null
    }
  }

  async function write(file, content) {
    if (!root) throw new Error('OPFS indisponível.')
    const handle = await root.getFileHandle(file, { create: true })
    if (typeof handle.createWritable !== 'function') {
      throw new Error('OPFS sem suporte a escrita neste navegador.')
    }
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
    if (!root) return false
    try {
      await root.removeEntry(file)
      return true
    } catch {
      return false
    }
  }

  async function stat(file) {
    if (!root) return null
    try {
      const handle = await root.getFileHandle(file)
      const blob = await handle.getFile()
      return { size: blob.size, lastModified: blob.lastModified }
    } catch {
      return null
    }
  }

  return {
    id: 'opfs',
    kind: 'sandbox',
    label: 'Armazenamento privado do navegador (OPFS)',
    description:
      'Grava os arquivos .txt no espaço privado do navegador. Não depende de permissão, mas é apagado junto com os dados do navegador.',
    supportsDirectoryPicker: false,
    get available() {
      return hasSupport
    },
    get ready() {
      return ready
    },
    get needsPermission() {
      return false
    },
    get directoryName() {
      return ROOT_DIR
    },
    init,
    async pick() {
      throw new Error('OPFS não permite escolher pasta. Use a pasta local para isso.')
    },
    async forget() {
      /* nada a esquecer */
    },
    async requestPermission() {
      return 'granted'
    },
    list,
    read,
    write,
    remove,
    stat,
  }
}
