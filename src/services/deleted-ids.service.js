/**
 * Deleted IDs Service
 * Stores deletion tracking in IndexedDB instead of localStorage
 * for better security (not accessible as plain text) and larger capacity.
 */

import { openDB } from './sqlite.service'

const STORE_KEY = 'deleted_ids'

/**
 * Load all deleted IDs from IndexedDB metadata store.
 * @returns {Promise<string[]>}
 */
export async function loadDeletedIdsFromIDB() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction('metadata', 'readonly')
      const store = tx.objectStore('metadata')
      const req = store.get(STORE_KEY)
      req.onsuccess = () => {
        const data = req.result
        resolve(data?.value || [])
      }
      req.onerror = () => reject(req.error)
    } catch (e) {
      reject(e)
    }
  })
}

/**
 * Save all deleted IDs to IndexedDB metadata store.
 * @param {string[]} ids
 * @returns {Promise<void>}
 */
export async function saveDeletedIdsToIDB(ids) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction('metadata', 'readwrite')
      const store = tx.objectStore('metadata')
      store.put({ key: STORE_KEY, value: ids, updatedAt: Date.now() })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    } catch (e) {
      reject(e)
    }
  })
}

/**
 * Clear all deleted IDs from IndexedDB.
 * @returns {Promise<void>}
 */
export async function clearDeletedIdsFromIDB() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction('metadata', 'readwrite')
      const store = tx.objectStore('metadata')
      store.delete(STORE_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    } catch (e) {
      reject(e)
    }
  })
}
