import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { clearWorkspace } from '../data/indexedDb'
import { loadPlatform, savePlatform } from '../data/platformStore'
import { createPasswordSalt, hashPassword, verifyPassword } from '../domain/password'
import type { AccountRole, AppTemplate, LowCodeApp, PlatformState, UserAccount } from '../types/platform'
import type { UserRole } from '../types/workspace'

interface AuthResult { ok: boolean; message?: string }
interface PlatformContextValue {
  platform: PlatformState
  ready: boolean
  currentUser: UserAccount | null
  activeApp: LowCodeApp | null
  userApps: LowCodeApp[]
  login: (email: string, password: string) => Promise<AuthResult>
  register: (name: string, email: string, password: string, role: UserRole) => Promise<AuthResult>
  logout: () => Promise<void>
  createApp: (name: string, description: string, template: AppTemplate) => Promise<LowCodeApp>
  updateApp: (app: LowCodeApp) => Promise<void>
  deleteApp: (appId: string) => Promise<void>
  setActiveApp: (appId: string) => Promise<void>
  updateUserRoles: (userId: string, roles: AccountRole[]) => Promise<AuthResult>
  deleteUser: (userId: string) => Promise<AuthResult>
}

const emptyPlatform: PlatformState = { schemaVersion: 1, users: [], apps: [], sessionUserId: null, activeAppId: null }
const PlatformContext = createContext<PlatformContextValue | null>(null)

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [platform, setPlatform] = useState<PlatformState>(emptyPlatform)
  const [ready, setReady] = useState(false)

  useEffect(() => { loadPlatform().then(setPlatform).finally(() => setReady(true)) }, [])

  const commit = async (next: PlatformState) => {
    setPlatform(next)
    await savePlatform(next)
  }

  const currentUser = platform.users.find((user) => user.id === platform.sessionUserId) ?? null
  const userApps = currentUser ? platform.apps.filter((app) => app.ownerId === currentUser.id) : []
  const activeApp = userApps.find((app) => app.id === platform.activeAppId) ?? null

  const login = async (email: string, password: string): Promise<AuthResult> => {
    const normalized = email.trim().toLowerCase()
    const user = platform.users.find((item) => item.email === normalized)
    if (!user || !(await verifyPassword(password, user.passwordSalt, user.passwordHash))) return { ok: false, message: '邮箱或密码不正确' }
    const firstApp = platform.apps.find((app) => app.ownerId === user.id)
    await commit({ ...platform, sessionUserId: user.id, activeAppId: firstApp?.id ?? null })
    return { ok: true }
  }

  const register = async (name: string, email: string, password: string, role: UserRole): Promise<AuthResult> => {
    const normalized = email.trim().toLowerCase()
    if (platform.users.some((user) => user.email === normalized)) return { ok: false, message: '这个邮箱已经注册' }
    if (password.length < 6) return { ok: false, message: '密码至少需要 6 位' }
    const createdAt = new Date().toISOString()
    const userId = `user_${crypto.randomUUID()}`
    const salt = createPasswordSalt()
    const user: UserAccount = { id: userId, name: name.trim(), email: normalized, passwordSalt: salt, passwordHash: await hashPassword(password, salt), roles: [role], createdAt }
    const app: LowCodeApp = {
      id: `app_${crypto.randomUUID()}`, ownerId: userId, name: '我的第一个应用',
      description: '从采购协同模板开始体验低代码搭建', template: 'procurement', status: 'developing', createdAt, updatedAt: createdAt,
    }
    await commit({ ...platform, users: [...platform.users, user], apps: [...platform.apps, app], sessionUserId: user.id, activeAppId: app.id })
    return { ok: true }
  }

  const logout = async () => commit({ ...platform, sessionUserId: null })

  const createApp = async (name: string, description: string, template: AppTemplate) => {
    if (!currentUser) throw new Error('请先登录')
    const createdAt = new Date().toISOString()
    const app: LowCodeApp = { id: `app_${crypto.randomUUID()}`, ownerId: currentUser.id, name: name.trim(), description: description.trim(), template, status: 'developing', createdAt, updatedAt: createdAt }
    await commit({ ...platform, apps: [...platform.apps, app], activeAppId: app.id })
    return app
  }

  const updateApp = async (app: LowCodeApp) => commit({ ...platform, apps: platform.apps.map((item) => item.id === app.id ? { ...app, updatedAt: new Date().toISOString() } : item) })

  const deleteApp = async (appId: string) => {
    const remaining = userApps.filter((app) => app.id !== appId)
    await clearWorkspace(appId)
    await commit({ ...platform, apps: platform.apps.filter((app) => app.id !== appId), activeAppId: platform.activeAppId === appId ? remaining[0]?.id ?? null : platform.activeAppId })
  }

  const setActiveApp = async (appId: string) => {
    if (!userApps.some((app) => app.id === appId)) return
    await commit({ ...platform, activeAppId: appId })
  }

  const updateUserRoles = async (userId: string, roles: AccountRole[]): Promise<AuthResult> => {
    if (!currentUser?.roles.includes('administrator')) return { ok: false, message: '没有管理员权限' }
    if (userId === currentUser.id) return { ok: false, message: '不能修改当前管理员自己的身份' }
    if (!roles.length) return { ok: false, message: '账号至少需要一个身份' }
    await commit({ ...platform, users: platform.users.map((user) => user.id === userId ? { ...user, roles } : user) })
    return { ok: true }
  }

  const deleteUser = async (userId: string): Promise<AuthResult> => {
    if (!currentUser?.roles.includes('administrator')) return { ok: false, message: '没有管理员权限' }
    if (userId === currentUser.id) return { ok: false, message: '不能删除当前登录的管理员' }
    const ownedApps = platform.apps.filter((app) => app.ownerId === userId)
    await Promise.all(ownedApps.map((app) => clearWorkspace(app.id)))
    await commit({ ...platform, users: platform.users.filter((user) => user.id !== userId), apps: platform.apps.filter((app) => app.ownerId !== userId) })
    return { ok: true }
  }

  const value = useMemo<PlatformContextValue>(() => ({ platform, ready, currentUser, activeApp, userApps, login, register, logout, createApp, updateApp, deleteApp, setActiveApp, updateUserRoles, deleteUser }), [platform, ready])
  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>
}

export function usePlatform() {
  const context = useContext(PlatformContext)
  if (!context) throw new Error('usePlatform must be used inside PlatformProvider')
  return context
}
