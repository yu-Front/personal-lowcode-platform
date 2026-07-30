import { createPasswordSalt, hashPassword } from '../domain/password'
import type { LowCodeApp, PlatformState } from '../types/platform'
import { getRecord, putRecord } from './indexedDb'

const PLATFORM_KEY = '__forge_platform__'
const SESSION_KEY = '__forge_session_user__'

const readSessionUserId = () => {
  if (typeof window === 'undefined') return null
  return window.sessionStorage.getItem(SESSION_KEY)
}

const syncSession = (userId: string | null) => {
  if (typeof window === 'undefined') return
  if (userId) window.sessionStorage.setItem(SESSION_KEY, userId)
  else window.sessionStorage.removeItem(SESSION_KEY)
}

export async function loadPlatform(): Promise<PlatformState> {
  const stored = await getRecord<PlatformState>(PLATFORM_KEY)
  if (stored) {
    const sessionUserId = readSessionUserId()
    const validSessionUserId = stored.users.some((user) => user.id === sessionUserId) ? sessionUserId : null
    if (!validSessionUserId) syncSession(null)
    const migrated: PlatformState = {
      ...stored,
      schemaVersion: 2,
      // 账号和应用保存在 IndexedDB；当前登录账号由 sessionStorage 恢复。
      sessionUserId: validSessionUserId,
      users: stored.users.map((user) => ({
        ...user,
        roles: user.roles?.length ? user.roles : user.email === 'demo@forge.local'
          ? ['administrator', 'applicant', 'department_manager', 'finance']
          : ['applicant'],
      })),
    }
    if (stored.schemaVersion !== 2 || stored.users.some((user) => !user.roles?.length)) await savePlatform(migrated)
    return migrated
  }
  const salt = createPasswordSalt()
  const createdAt = new Date().toISOString()
  const userId = 'user_demo_cyril'
  const app: LowCodeApp = {
    id: 'app_demo_procurement', ownerId: userId, name: '采购协同应用',
    description: '从申请、部门审批到财务复核的轻量采购流程', template: 'procurement',
    status: 'published', createdAt, updatedAt: createdAt,
  }
  const initial: PlatformState = {
    schemaVersion: 2,
    users: [{ id: userId, name: 'Cyril', email: 'demo@forge.local', passwordSalt: salt, passwordHash: await hashPassword('demo123', salt), roles: ['administrator', 'applicant', 'department_manager', 'finance'], createdAt }],
    apps: [app],
    sessionUserId: null,
    activeAppId: app.id,
  }
  await savePlatform(initial)
  return initial
}

export function savePlatform(platform: PlatformState) {
  syncSession(platform.sessionUserId)
  // 会话单独保存在 sessionStorage，避免 IndexedDB 中的旧登录态导致自动登录。
  return putRecord(PLATFORM_KEY, { ...platform, sessionUserId: null })
}
