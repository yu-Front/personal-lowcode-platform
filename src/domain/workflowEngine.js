export const FINANCE_THRESHOLD = 10000

export function nextStepAfterDepartment(amount) {
  return Number(amount) > FINANCE_THRESHOLD ? 'pending_finance' : 'approved'
}

export function evaluateCondition(expression, data) {
  const match = String(expression ?? '').trim().match(/^([A-Za-z_][\w.]*)\s*(>=|<=|==|!=|>|<)\s*(.+)$/)
  if (!match) return false
  const [, path, operator, rawExpected] = match
  const actual = path.split('.').reduce((value, key) => value?.[key], data)
  const normalized = rawExpected.trim().replace(/^['"]|['"]$/g, '')
  const expected = normalized === 'true' ? true : normalized === 'false' ? false : normalized !== '' && !Number.isNaN(Number(normalized)) ? Number(normalized) : normalized
  if (operator === '==') return actual == expected
  if (operator === '!=') return actual != expected
  if (operator === '>') return Number(actual) > Number(expected)
  if (operator === '<') return Number(actual) < Number(expected)
  if (operator === '>=') return Number(actual) >= Number(expected)
  if (operator === '<=') return Number(actual) <= Number(expected)
  return false
}

export function statusLabel(status) {
  return {
    draft: '草稿',
    pending_department: '部门审批',
    pending_finance: '财务审批',
    approved: '已通过',
    rejected: '已驳回',
  }[status] ?? status
}

export function validateFlow(flow, workspace) {
  const errors = []
  const nodeIds = new Set(flow.nodes?.map((node) => node.id) ?? [])
  const hasTarget = (targetId) => Boolean(targetId && nodeIds.has(targetId))
  const object = workspace.objects?.find((item) => item.id === flow.objectId)
  if (!object) errors.push('未绑定有效业务对象')
  const starts = flow.nodes?.filter((node) => node.type === 'start') ?? []
  const ends = flow.nodes?.filter((node) => node.type === 'end') ?? []
  if (starts.length !== 1) errors.push('需要且只能有一个开始节点')
  if (!ends.length) errors.push('至少需要一个结束节点')

  flow.nodes?.forEach((node) => {
    const page = workspace.pages?.find((item) => item.id === node.pageId)
    if (node.type === 'start') {
      if (!page || page.objectId !== flow.objectId) errors.push(`开始节点「${node.name}」未绑定同一业务对象的触发页面`)
      if (!page?.components.some((component) => component.id === node.actionComponentId && component.type === 'button')) errors.push(`开始节点「${node.name}」未绑定页面提交按钮`)
      if (!hasTarget(node.nextNodeId)) errors.push(`开始节点「${node.name}」未配置后续节点`)
    }
    if (node.type === 'approval') {
      if (!node.assigneeRole) errors.push(`审批节点「${node.name}」未配置处理角色`)
      if (!page || page.objectId !== flow.objectId) errors.push(`审批节点「${node.name}」未绑定任务页面`)
      if (!hasTarget(node.approveTargetNodeId)) errors.push(`审批节点「${node.name}」未配置同意流向`)
      if (!node.rejectStrategy) errors.push(`审批节点「${node.name}」未配置驳回策略`)
      if (node.rejectStrategy === 'node' && !hasTarget(node.rejectTargetNodeId)) errors.push(`审批节点「${node.name}」未配置驳回目标`)
    }
    if (node.type === 'condition') {
      if (!node.condition?.trim()) errors.push(`条件节点「${node.name}」未配置表达式`)
      if (!hasTarget(node.trueTargetNodeId) || !hasTarget(node.falseTargetNodeId)) errors.push(`条件节点「${node.name}」的分支流向不完整`)
    }
    if (node.type === 'service') {
      if (!workspace.services?.some((service) => service.id === node.serviceId)) errors.push(`服务节点「${node.name}」未绑定有效服务`)
      if (!hasTarget(node.nextNodeId)) errors.push(`服务节点「${node.name}」未配置成功流向`)
      if (node.failureTargetNodeId && !hasTarget(node.failureTargetNodeId)) errors.push(`服务节点「${node.name}」的失败流向无效`)
    }
  })
  return errors
}

export function validateRelease(workspace) {
  const errors = []
  if (!workspace.objects?.length) errors.push('至少创建一个数据对象')
  if (!workspace.pages?.length) errors.push('至少创建一个页面')
  if (!workspace.flows?.length) errors.push('至少创建一个流程')
  workspace.pages?.forEach((page) => {
    if (!workspace.objects.some((item) => item.id === page.objectId)) {
      errors.push(`页面「${page.name}」未绑定有效对象`)
    }
  })
  workspace.flows?.forEach((flow) => validateFlow(flow, workspace).forEach((error) => errors.push(`流程「${flow.name}」：${error}`)))
  return errors
}
