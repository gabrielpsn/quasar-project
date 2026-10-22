import { defineBoot } from '#q-app/wrappers'
import { useStorageStore } from 'src/stores/storage'

/**
 * Inicializa a camada de armazenamento em arquivos `.txt` antes do app montar.
 * Escolhe automaticamente o melhor modo disponível:
 *   1. Pasta local do usuário (File System Access API)
 *   2. Armazenamento privado do navegador (OPFS)
 *   3. Memória/localStorage (contingência)
 */
export default defineBoot(async ({ store }) => {
  const storage = useStorageStore(store)
  try {
    await storage.init()
    await storage.seedMissing()
  } catch (error) {
    console.error('[storage] falha ao inicializar:', error)
  }

  // Garante que o que estiver pendente seja gravado ao sair da aba.
  const flush = () => {
    storage.flush().catch(() => {})
  }
  window.addEventListener('pagehide', flush)
  window.addEventListener('beforeunload', flush)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
})
