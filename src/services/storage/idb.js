const DB_NAME = 'finance-app-storage'
const DB_VERSION = 1
const STORE = 'handles'

let dbPromise = null

function openDb() {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponível neste navegador.'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  }).catch((error) => {
    dbPromise = null
    throw error
  })

  return dbPromise
}

function withStore(mode, action) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE, mode)
        const store = transaction.objectStore(STORE)
        let request = null
        try {
          request = action(store)
        } catch (error) {
          reject(error)
          return
        }
        transaction.oncomplete = () => resolve(request ? request.result : undefined)
        transaction.onerror = () => reject(transaction.error)
        transaction.onabort = () => reject(transaction.error)
      })
  )
}

export function idbSet(key, value) {
  return withStore('readwrite', (store) => store.put(value, key))
}

export function idbGet(key) {
  return withStore('readonly', (store) => store.get(key))
}

export function idbDelete(key) {
  return withStore('readwrite', (store) => store.delete(key))
}
