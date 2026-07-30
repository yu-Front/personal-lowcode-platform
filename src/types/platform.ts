import type { UserRole } from './workspace'

export type AppTemplate = 'procurement' | 'blank'
export type AccountRole = 'administrator' | UserRole

export interface UserAccount {
  id: string
  name: string
  email: string
  passwordHash: string
  passwordSalt: string
  roles: AccountRole[]
  createdAt: string
}

export interface LowCodeApp {
  id: string
  ownerId: string
  name: string
  description: string
  template: AppTemplate
  status: 'developing' | 'published'
  createdAt: string
  updatedAt: string
}

export interface PlatformState {
  schemaVersion: number
  users: UserAccount[]
  apps: LowCodeApp[]
  sessionUserId: string | null
  activeAppId: string | null
}
