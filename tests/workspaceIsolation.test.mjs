import test from 'node:test'
import assert from 'node:assert/strict'
import { workspaceBelongsToApp } from '../src/data/indexedDb.ts'

test('带所属应用标记的工作空间只能由对应应用读取', () => {
  const workspace = { ownerAppId: 'app_leave' }
  assert.equal(workspaceBelongsToApp(workspace, 'app_leave'), true)
  assert.equal(workspaceBelongsToApp(workspace, 'app_purchase'), false)
})

test('旧工作空间允许首次加载并补写所属应用标记', () => {
  assert.equal(workspaceBelongsToApp({}, 'app_leave'), true)
})
