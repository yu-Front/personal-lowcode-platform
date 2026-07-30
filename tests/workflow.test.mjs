import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCondition, FINANCE_THRESHOLD, nextStepAfterDepartment, validateFlow, validateRelease } from '../src/domain/workflowEngine.js'

test('金额超过阈值时进入财务审批', () => {
  assert.equal(FINANCE_THRESHOLD, 10000)
  assert.equal(nextStepAfterDepartment(10001), 'pending_finance')
  assert.equal(nextStepAfterDepartment(10000), 'approved')
})

test('发布校验可以识别缺失配置', () => {
  const errors = validateRelease({ objects: [], pages: [], services: [], flows: [] })
  assert.equal(errors.length, 3)
})

test('完整配置可以通过发布校验', () => {
  const workspace = {
    objects: [{ id: 'object_1' }],
    pages: [{ id: 'page_1', name: '表单', objectId: 'object_1', components: [{ id: 'button_1', type: 'button' }] }],
    services: [{ id: 'service_1' }],
    flows: [{ name: '流程', objectId: 'object_1', nodes: [
      { id: 'start_1', type: 'start', name: '提交', pageId: 'page_1', actionComponentId: 'button_1', nextNodeId: 'end_1' },
      { id: 'end_1', type: 'end', name: '完成', endResult: 'completed' },
    ] }],
  }
  assert.deepEqual(validateRelease(workspace), [])
})

test('审批节点支持退回上一步并绑定任务页面', () => {
  const workspace = {
    objects: [{ id: 'leave' }],
    pages: [{ id: 'leave_form', objectId: 'leave', components: [{ id: 'submit', type: 'button' }] }],
    services: [],
  }
  const flow = {
    objectId: 'leave',
    nodes: [
      { id: 'start', type: 'start', name: '提交请假', pageId: 'leave_form', actionComponentId: 'submit', nextNodeId: 'manager' },
      { id: 'manager', type: 'approval', name: '直属主管审批', pageId: 'leave_form', assigneeRole: 'department_manager', approveTargetNodeId: 'end', rejectStrategy: 'previous' },
      { id: 'end', type: 'end', name: '审批完成', endResult: 'approved' },
    ],
  }
  assert.deepEqual(validateFlow(flow, workspace), [])
})

test('通用运行引擎可以解析请假天数与枚举条件', () => {
  assert.equal(evaluateCondition('days > 3', { days: 5 }), true)
  assert.equal(evaluateCondition('days <= 3', { days: 5 }), false)
  assert.equal(evaluateCondition('leaveType == "年假"', { leaveType: '年假' }), true)
})
