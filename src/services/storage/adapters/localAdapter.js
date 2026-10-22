const PREFIX = 'finance-app-file:'

/**
 * Adaptador de último recurso: mantém os dados em memória e replica em
 * `localStorage` (limitado a ~5 MB). Usado quando o navegador não oferece
 * File System Access API nem OPFS. O usuário pode exportar manualmente os
 * arquivos `.txt` a qualquer momento.
 */
export function createLocalAdapter() {
  const memory = new Map()
  let available = true

  function key(file) {
    return `${PREFIX}${file}`
  }

  function canPersist() {
    try {
      const probe = `${PREFIX}__probe__`
      localStorage.setItem(probe, '1')
      localStorage.removeItem(probe)
      return true
    } catch {
      available = false
      return false
    }
  }

  async function list() {
    const names = new Set(memory.keys())
    if (canPersist()) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith(PREFIX)) names.add(k.slice(PREFIX.length))
      }
    }
    return [...names].sort()
  }

  async function read(file) {
    if (memory.has(file)) return memory.get(file)
    if (canPersist()) {
      const value = localStorage.getItem(key(file))
      if (value !== null) {
        memory.set(file, value)
        return value
      }
    }
    return null
  }

  async function write(file, content) {
    memory.set(file, content)
    if (!canPersist()) return
    try {
      localStorage.setItem(key(file), content)
    } catch {
      available = false
    }
  }

  async function remove(file) {
    memory.delete(file)
    if (canPersist()) localStorage.removeItem(key(file))
  }

  async function stat(file) {
    const content = await read(file)
    if (content === null) return null
    return { size: new Blob([content]).size, lastModified: Date.now() }
  }

  return {
    id: 'local',
    kind: 'memory',
    label: 'Memória do navegador (localStorage)',
    description:
      'Modo de contingência: guarda os dados no navegador e permite exportar/importar arquivos .txt manualmente.',
    supportsDirectoryPicker: false,
    get available() {
      return available
    },
    get ready() {
      return true
    },
    get needsPermission() {
      return false
    },
    get directoryName() {
      return 'localStorage'
    },
    async init() {
      canPersist()
      return null
    },
    async pick() {
      throw new Error('Este modo não permite escolher pasta.')
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
