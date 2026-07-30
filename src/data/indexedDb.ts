import type { WorkspaceState } from '../types/workspace'

const DB_NAME = 'cyril-personal-lowcode-platform'
const STORE_NAME = 'workspace'
const LEGACY_WORKSPACE_KEY = 'default'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getRecord<T>(key: string): Promise<T | null> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(key)
    request.onsuccess = () => resolve((request.result as T | undefined) ?? null)
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => db.close()
  })
}

export async function putRecord<T>(key: string, value: T): Promise<void> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(value, key)
    transaction.oncomplete = () => {
      db.close()
      resolve()
    }
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function deleteRecord(key: string): Promise<void> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).delete(key)
    transaction.oncomplete = () => {
      db.close()
      resolve()
    }
    transaction.onerror = () => reject(transaction.error)
  })
}

const workspaceKey = (appId: string) => `app:${appId}`
const recoveryKey = (appId: string) => `recovery:${appId}:${new Date().toISOString()}`

export async function loadWorkspace(appId: string): Promise<WorkspaceState | null> {
  const stored = await getRecord<WorkspaceState>(workspaceKey(appId))
  if (stored) {
    if (stored.ownerAppId && stored.ownerAppId !== appId) {
      console.error(`Workspace isolation violation: expected ${appId}, received ${stored.ownerAppId}`)
      return null
    }
    return stored
  }
  if (appId === 'app_demo_procurement') return getRecord<WorkspaceState>(LEGACY_WORKSPACE_KEY)
  return null
}

export function saveWorkspace(workspace: WorkspaceState, appId: string): Promise<void> {
  return putRecord(workspaceKey(appId), { ...workspace, ownerAppId: appId })
}

export function backupWorkspace(workspace: WorkspaceState, appId: string): Promise<void> {
  return putRecord(recoveryKey(appId), workspace)
}

export function workspaceBelongsToApp(workspace: WorkspaceState, appId: string) {
  return !workspace.ownerAppId || workspace.ownerAppId === appId
}

export function clearWorkspace(appId: string): Promise<void> {
  return deleteRecord(workspaceKey(appId))
}
