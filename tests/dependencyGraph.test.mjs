import test from 'node:test'
import assert from 'node:assert/strict'
import { findResourceReferences, referenceMessage } from '../src/domain/dependencyGraph.ts'

const workspace = {
  pages: [{ id: 'page_leave', name: '请假申请表', objectId: 'object_leave' }],
  services: [{ id: 'service_leave', name: '请假数据服务', objectId: 'object_leave' }],
  flows: [{
    id: 'flow_leave', name: '请假审批', objectId: 'object_leave', nodes: [
      { id: 'start', type: 'start', name: '提交请假', pageId: 'page_leave' },
      { id: 'manager', type: 'approval', name: '主管审批', pageId: 'page_leave' },
      { id: 'notify', type: 'service', name: '发送通知', serviceId: 'service_notify' },
    ],
  }],
}

test('页面被流程多个节点引用时禁止删除并列出引用位置', () => {
  const references = findResourceReferences(workspace, 'page', 'page_leave')
  assert.equal(references.length, 2)
  assert.match(referenceMessage('页面「请假表单」', references), /请假审批/)
  assert.match(referenceMessage('页面「请假表单」', references), /主管审批/)
})

test('服务被流程节点引用时可以定位引用', () => {
  const references = findResourceReferences(workspace, 'service', 'service_notify')
  assert.deepEqual(references.map((item) => item.location), ['节点「发送通知」'])
})

test('未被引用的流程允许删除', () => {
  assert.deepEqual(findResourceReferences(workspace, 'flow', 'flow_leave'), [])
})

test('数据对象被页面、服务和流程绑定时禁止删除', () => {
  const references = findResourceReferences(workspace, 'object', 'object_leave')
  assert.deepEqual(references.map((item) => item.ownerType), ['page', 'service', 'flow'])
  const message = referenceMessage('数据对象「请假申请」', references)
  assert.match(message, /请假申请表/)
  assert.match(message, /请假数据服务/)
  assert.match(message, /请假审批/)
})
