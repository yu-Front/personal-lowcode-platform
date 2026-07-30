import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { backupWorkspace, clearWorkspace, loadWorkspace, saveWorkspace } from '../data/indexedDb'
import { createBlankWorkspace, createSeedWorkspace } from '../data/seed'
import { migrateWorkspace } from '../data/workspaceMigration'
import { evaluateCondition, nextStepAfterDepartment, validateRelease } from '../domain/workflowEngine.js'
import { findResourceReferences, type ResourceReference } from '../domain/dependencyGraph'
import type {
  ApprovalTask,
  DataObject,
  FlowDefinition,
  PageSchema,
  PurchaseRequest,
  RuntimeFlowAudit,
  RuntimeFlowTask,
  RuntimeRecord,
  ServiceDefinition,
  WorkspaceState,
} from '../types/workspace'
import { delay, MIN_LOADING_MS } from '../utils/async'
import { usePlatform } from './PlatformContext'

type Decision = 'approve' | 'reject'
interface DeleteResult { ok: boolean; references: ResourceReference[] }
interface RuntimeResult { ok: boolean; message?: string; recordId?: string }

interface WorkspaceContextValue {
  workspace: WorkspaceState
  ready: boolean
  saveState: 'saved' | 'saving'
  updateObject: (object: DataObject) => void
  addObject: () => void
  deleteObject: (id: string) => DeleteResult
  updatePage: (page: PageSchema) => void
  addPage: () => string | null
  deletePage: (id: string) => DeleteResult
  updateService: (service: ServiceDefinition) => void
  addService: () => string
  deleteService: (id: string) => DeleteResult
  updateFlow: (flow: FlowDefinition) => void
  addFlow: () => string | null
  deleteFlow: (id: string) => DeleteResult
  publish: (note: string) => string[]
  submitRequest: (request: Omit<PurchaseRequest, 'id' | 'requestNo' | 'status' | 'createdAt' | 'updatedAt'>) => string
  decideTask: (taskId: string, decision: Decision, comment: string) => void
  submitRuntimeRecord: (pageId: string, data: Record<string, unknown>) => RuntimeResult
  decideRuntimeTask: (taskId: string, decision: Decision, comment: string) => RuntimeResult
  restoreSample: () => Promise<void>
  clearSandbox: () => Promise<void>
  importWorkspace: (state: WorkspaceState) => void
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)
const uid = (prefix: string) => `${prefix}_${crypto.randomUUID()}`
const now = () => new Date().toISOString()

const publishedConfig = (workspace: WorkspaceState) => workspace.releases[0]?.snapshot ?? workspace

function advanceRuntime(workspace: WorkspaceState, flow: FlowDefinition, record: RuntimeRecord, firstNodeId: string | undefined, actor: string): WorkspaceState {
  let currentRecord = record
  let targetId = firstNodeId
  let tasks = workspace.runtimeTasks
  let audit = workspace.runtimeAudit
  const visited = new Set<string>()

  while (targetId && !visited.has(targetId)) {
    visited.add(targetId)
    const node = flow.nodes.find((item) => item.id === targetId)
    if (!node) break
    const timestamp = now()
    currentRecord = { ...currentRecord, currentNodeId: node.id, status: 'running', updatedAt: timestamp }

    if (node.type === 'approval') {
      const task: RuntimeFlowTask = { id: uid('runtime_task'), recordId: record.id, flowId: flow.id, nodeId: node.id, nodeName: node.name, pageId: node.pageId, role: node.assigneeRole ?? 'department_manager', status: 'pending', createdAt: timestamp }
      tasks = [task, ...tasks]
      audit = [{ id: uid('runtime_audit'), recordId: record.id, flowId: flow.id, nodeId: node.id, action: '生成审批任务', actor: '流程引擎', detail: `任务已分配给${task.role === 'department_manager' ? '部门经理' : task.role === 'finance' ? '财务审批人' : '申请人'}`, createdAt: timestamp }, ...audit]
      break
    }
    if (node.type === 'condition') {
      const matched = evaluateCondition(node.condition, record.data)
      targetId = matched ? node.trueTargetNodeId : node.falseTargetNodeId
      audit = [{ id: uid('runtime_audit'), recordId: record.id, flowId: flow.id, nodeId: node.id, action: '条件判断', actor: '流程引擎', detail: `${node.condition || '未配置条件'} → ${matched ? '是' : '否'}`, createdAt: timestamp }, ...audit]
      continue
    }
    if (node.type === 'service') {
      const service = publishedConfig(workspace).services.find((item) => item.id === node.serviceId)
      const succeeded = Boolean(service)
      targetId = succeeded ? node.nextNodeId : node.failureTargetNodeId
      audit = [{ id: uid('runtime_audit'), recordId: record.id, flowId: flow.id, nodeId: node.id, action: succeeded ? '服务调用成功' : '服务调用失败', actor: '流程引擎', detail: service?.name ?? '未找到绑定服务', createdAt: timestamp }, ...audit]
      continue
    }
    if (node.type === 'end') {
      currentRecord = { ...currentRecord, currentNodeId: node.id, status: node.endResult ?? 'completed', updatedAt: timestamp }
      audit = [{ id: uid('runtime_audit'), recordId: record.id, flowId: flow.id, nodeId: node.id, action: '流程结束', actor: '流程引擎', detail: node.name, createdAt: timestamp }, ...audit]
      targetId = undefined
      break
    }
    targetId = node.nextNodeId
  }

  return {
    ...workspace,
    runtimeRecords: workspace.runtimeRecords.some((item) => item.id === record.id) ? workspace.runtimeRecords.map((item) => item.id === record.id ? currentRecord : item) : [currentRecord, ...workspace.runtimeRecords],
    runtimeTasks: tasks,
    runtimeAudit: audit,
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { activeApp, currentUser } = usePlatform()
  const [workspace, setWorkspace] = useState<WorkspaceState>(createSeedWorkspace)
  const [ready, setReady] = useState(false)
  const [loadedAppId, setLoadedAppId] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved')
  const loadGenerationRef = useRef(0)
  const saveGenerationRef = useRef(0)
  const activeAppIdRef = useRef<string | null>(activeApp?.id ?? null)
  const loadedAppIdRef = useRef<string | null>(null)
  activeAppIdRef.current = activeApp?.id ?? null

  useEffect(() => {
    const generation = ++loadGenerationRef.current
    if (!activeApp) {
      loadedAppIdRef.current = null
      setLoadedAppId(null)
      setReady(false)
      return
    }
    const app = activeApp
    loadedAppIdRef.current = null
    setLoadedAppId(null)
    setReady(false)
    setSaveState('saved')
    void (async () => {
      const stored = await loadWorkspace(app.id)
      if (generation !== loadGenerationRef.current || activeAppIdRef.current !== app.id) return
      const suspiciousLegacyData = stored && !stored.ownerAppId && stored.appName !== app.name
      if (suspiciousLegacyData) await backupWorkspace(stored, app.id)
      const raw = !stored || suspiciousLegacyData
        ? (app.template === 'blank' ? createBlankWorkspace(app.name, app.description) : { ...createSeedWorkspace(), appName: app.name, appDescription: app.description })
        : stored
      const initial = { ...migrateWorkspace(raw), ownerAppId: app.id }
      if (!stored || suspiciousLegacyData || stored.schemaVersion < 3 || !stored.ownerAppId) await saveWorkspace(initial, app.id)
      if (generation !== loadGenerationRef.current || activeAppIdRef.current !== app.id) return
      setWorkspace(initial)
      loadedAppIdRef.current = app.id
      setLoadedAppId(app.id)
      setReady(true)
    })()
  }, [activeApp?.id])

  useEffect(() => {
    if (!ready || !activeApp || loadedAppId !== activeApp.id || workspace.ownerAppId !== activeApp.id) return
    const targetAppId = activeApp.id
    const generation = ++saveGenerationRef.current
    const startedAt = Date.now()
    setSaveState('saving')
    const timer = window.setTimeout(async () => {
      if (activeAppIdRef.current !== targetAppId || loadedAppIdRef.current !== targetAppId) return
      const next = { ...workspace, ownerAppId: targetAppId, lastSavedAt: now() }
      await saveWorkspace(next, targetAppId)
      await delay(Math.max(0, MIN_LOADING_MS - (Date.now() - startedAt)))
      if (generation === saveGenerationRef.current && activeAppIdRef.current === targetAppId && loadedAppIdRef.current === targetAppId) setSaveState('saved')
    }, 280)
    return () => {
      window.clearTimeout(timer)
      if (saveGenerationRef.current === generation) saveGenerationRef.current += 1
    }
  }, [workspace, ready, loadedAppId, activeApp?.id])

  const patchWorkspace = useCallback((patcher: (current: WorkspaceState) => WorkspaceState) => {
    setWorkspace((current) => {
      const targetAppId = activeAppIdRef.current
      if (!targetAppId || loadedAppIdRef.current !== targetAppId || current.ownerAppId !== targetAppId) return current
      return { ...patcher(current), ownerAppId: targetAppId }
    })
  }, [])

  const updateObject = (object: DataObject) => patchWorkspace((current) => ({
    ...current,
    objects: current.objects.map((item) => item.id === object.id ? { ...object, updatedAt: now() } : item),
  }))

  const addObject = () => patchWorkspace((current) => ({
    ...current,
    objects: [...current.objects, {
      id: uid('object'),
      name: '新数据对象',
      code: `object_${current.objects.length + 1}`,
      description: '描述这个对象在应用中的用途',
      fields: [{ id: uid('field'), name: '名称', code: 'name', type: 'text', required: true }],
      updatedAt: now(),
    }],
  }))

  const deleteObject = (id: string): DeleteResult => {
    const references = findResourceReferences(workspace, 'object', id)
    if (references.length) return { ok: false, references }
    patchWorkspace((current) => ({ ...current, objects: current.objects.filter((item) => item.id !== id) }))
    return { ok: true, references: [] }
  }

  const updatePage = (page: PageSchema) => patchWorkspace((current) => ({
    ...current,
    pages: current.pages.map((item) => item.id === page.id ? { ...page, updatedAt: now() } : item),
  }))

  const addPage = () => {
    if (!workspace.objects.length) return null
    const id = uid('page')
    patchWorkspace((current) => ({ ...current, pages: [...current.pages, { id, name: '新建表单', route: `/runtime/page-${current.pages.length + 1}`, description: '通过页面设计器创建的业务表单', objectId: current.objects[0].id, components: [], updatedAt: now() }] }))
    return id
  }

  const deletePage = (id: string): DeleteResult => {
    const references = findResourceReferences(workspace, 'page', id)
    if (references.length) return { ok: false, references }
    patchWorkspace((current) => ({ ...current, pages: current.pages.filter((page) => page.id !== id) }))
    return { ok: true, references: [] }
  }

  const updateService = (service: ServiceDefinition) => patchWorkspace((current) => ({
    ...current,
    services: current.services.map((item) => item.id === service.id ? service : item),
  }))

  const addService = () => {
    const id = uid('service')
    patchWorkspace((current) => ({ ...current, services: [...current.services, { id, name: '新建 Mock 服务', code: `service_${current.services.length + 1}`, method: 'POST', path: `/mock/service-${current.services.length + 1}`, type: 'mock', description: '浏览器本地模拟服务', mockResponse: { success: true } }] }))
    return id
  }

  const deleteService = (id: string): DeleteResult => {
    const references = findResourceReferences(workspace, 'service', id)
    if (references.length) return { ok: false, references }
    patchWorkspace((current) => ({ ...current, services: current.services.filter((service) => service.id !== id) }))
    return { ok: true, references: [] }
  }

  const updateFlow = (flow: FlowDefinition) => patchWorkspace((current) => ({
    ...current,
    flows: current.flows.map((item) => item.id === flow.id ? { ...flow, updatedAt: now() } : item),
  }))

  const addFlow = () => {
    if (!workspace.objects.length) return null
    const id = uid('flow')
    patchWorkspace((current) => {
      const startId = uid('node')
      const endId = uid('node')
      const objectId = current.objects[0].id
      const page = current.pages.find((item) => item.objectId === objectId)
      return { ...current, flows: [...current.flows, {
        id,
        name: `${current.appName}流程 ${current.flows.length + 1}`,
        code: `flow_${current.flows.length + 1}`,
        description: `处理${current.appName}的提交、审批与退回`,
        objectId,
        updatedAt: now(),
        nodes: [
          { id: startId, type: 'start', name: '表单提交', pageId: page?.id, actionComponentId: page?.components.find((component) => component.type === 'button')?.id, nextNodeId: endId },
          { id: endId, type: 'end', name: '流程结束', endResult: 'completed' },
        ],
      }] }
    })
    return id
  }

  const deleteFlow = (id: string): DeleteResult => {
    const references = findResourceReferences(workspace, 'flow', id)
    if (references.length) return { ok: false, references }
    patchWorkspace((current) => ({ ...current, flows: current.flows.filter((flow) => flow.id !== id) }))
    return { ok: true, references: [] }
  }

  const publish = (note: string) => {
    const errors = validateRelease(workspace)
    if (errors.length) return errors
    patchWorkspace((current) => {
      const version = `v1.${current.releases.length}.0`
      return {
        ...current,
        releases: [{
          id: uid('release'),
          version,
          note: note || '发布配置更新',
          createdAt: now(),
          snapshot: {
            objects: structuredClone(current.objects),
            pages: structuredClone(current.pages),
            services: structuredClone(current.services),
            flows: structuredClone(current.flows),
          },
        }, ...current.releases],
      }
    })
    return []
  }

  const submitRequest = (payload: Omit<PurchaseRequest, 'id' | 'requestNo' | 'status' | 'createdAt' | 'updatedAt'>) => {
    const requestId = uid('request')
    if (!currentUser?.roles.includes('applicant')) return ''
    patchWorkspace((current) => {
      const createdAt = now()
      const request: PurchaseRequest = {
        ...payload,
        id: requestId,
        requestNo: `PR-${new Date().getFullYear()}-${String(current.requests.length + 1).padStart(4, '0')}`,
        status: 'pending_department',
        createdAt,
        updatedAt: createdAt,
      }
      const task: ApprovalTask = {
        id: uid('task'), requestId, nodeName: '部门经理审批', role: 'department_manager', status: 'pending', createdAt,
      }
      return {
        ...current,
        requests: [request, ...current.requests],
        tasks: [task, ...current.tasks],
        audit: [{ id: uid('audit'), requestId, action: '提交申请', actor: payload.applicant, detail: '流程已进入部门经理审批', createdAt }, ...current.audit],
      }
    })
    return requestId
  }

  const decideTask = (taskId: string, decision: Decision, comment: string) => patchWorkspace((current) => {
    const task = current.tasks.find((item) => item.id === taskId)
    if (!task || task.status !== 'pending') return current
    if (!currentUser?.roles.includes(task.role)) return current
    const request = current.requests.find((item) => item.id === task.requestId)
    if (!request) return current
    const completedAt = now()
    const actor = currentUser.name
    let requestStatus: PurchaseRequest['status'] = 'rejected'
    let newTask: ApprovalTask | null = null
    let detail = comment || '申请信息不符合要求'

    if (decision === 'approve') {
      requestStatus = task.role === 'department_manager' ? nextStepAfterDepartment(request.amount) : 'approved'
      if (requestStatus === 'pending_finance') {
        newTask = { id: uid('task'), requestId: request.id, nodeName: '财务审批', role: 'finance', status: 'pending', createdAt: completedAt }
        detail = comment || '金额超过 10,000 元，已转交财务审批'
      } else {
        detail = comment || '审批通过，流程已完成'
      }
    }

    return {
      ...current,
      requests: current.requests.map((item) => item.id === request.id ? { ...item, status: requestStatus, updatedAt: completedAt } : item),
      tasks: [
        ...(newTask ? [newTask] : []),
        ...current.tasks.map((item): ApprovalTask => item.id === task.id ? { ...item, status: decision === 'approve' ? 'approved' : 'rejected', completedAt, comment } : item),
      ],
      audit: [{
        id: uid('audit'), requestId: request.id, action: decision === 'approve' ? '审批通过' : '审批驳回', actor, detail, createdAt: completedAt,
      }, ...current.audit],
    }
  })

  const submitRuntimeRecord = (pageId: string, data: Record<string, unknown>): RuntimeResult => {
    if (!currentUser?.roles.includes('applicant')) return { ok: false, message: '当前账号没有申请人身份' }
    const config = publishedConfig(workspace)
    if (!workspace.releases.length) return { ok: false, message: '当前应用尚未发布，请先在发布中心生成版本' }
    const page = config.pages.find((item) => item.id === pageId)
    if (!page) return { ok: false, message: '发布版本中不存在该页面' }
    const flow = config.flows.find((item) => item.nodes.some((node) => node.type === 'start' && node.pageId === pageId))
    const start = flow?.nodes.find((node) => node.type === 'start' && node.pageId === pageId)
    if (!flow || !start) return { ok: false, message: '该页面尚未绑定可执行流程' }
    const createdAt = now()
    const record: RuntimeRecord = {
      id: uid('record'), recordNo: `RUN-${new Date().getFullYear()}-${String(workspace.runtimeRecords.length + 1).padStart(4, '0')}`,
      objectId: page.objectId, pageId, flowId: flow.id, data, status: 'running', currentNodeId: start.id, createdBy: currentUser.name, createdAt, updatedAt: createdAt,
    }
    patchWorkspace((current) => {
      const withRecord: WorkspaceState = {
        ...current,
        runtimeRecords: [record, ...current.runtimeRecords],
        runtimeAudit: [{ id: uid('runtime_audit'), recordId: record.id, flowId: flow.id, nodeId: start.id, action: '提交表单', actor: currentUser.name, detail: `通过页面「${page.name}」启动流程`, createdAt }, ...current.runtimeAudit],
      }
      return advanceRuntime(withRecord, flow, record, start.nextNodeId, currentUser.name)
    })
    return { ok: true, recordId: record.id }
  }

  const decideRuntimeTask = (taskId: string, decision: Decision, comment: string): RuntimeResult => {
    const task = workspace.runtimeTasks.find((item) => item.id === taskId)
    if (!task || task.status !== 'pending') return { ok: false, message: '待办不存在或已处理' }
    if (!currentUser?.roles.includes(task.role)) return { ok: false, message: '当前账号没有处理该待办的身份' }
    const config = publishedConfig(workspace)
    const flow = config.flows.find((item) => item.id === task.flowId)
    const node = flow?.nodes.find((item) => item.id === task.nodeId)
    const record = workspace.runtimeRecords.find((item) => item.id === task.recordId)
    if (!flow || !node || node.type !== 'approval' || !record) return { ok: false, message: '流程配置或业务记录不存在' }
    const timestamp = now()
    patchWorkspace((current) => {
      let next: WorkspaceState = {
        ...current,
        runtimeTasks: current.runtimeTasks.map((item): RuntimeFlowTask => item.id === task.id ? { ...item, status: decision === 'approve' ? 'approved' : node.rejectStrategy === 'terminate' ? 'rejected' : 'returned', completedAt: timestamp, comment } : item),
        runtimeAudit: [{ id: uid('runtime_audit'), recordId: record.id, flowId: flow.id, nodeId: node.id, action: decision === 'approve' ? '审批通过' : '审批退回', actor: currentUser.name, detail: comment || (decision === 'approve' ? '同意' : '退回修改'), createdAt: timestamp }, ...current.runtimeAudit],
      }
      if (decision === 'approve') return advanceRuntime(next, flow, record, node.approveTargetNodeId, currentUser.name)
      if (node.rejectStrategy === 'terminate') {
        return { ...next, runtimeRecords: next.runtimeRecords.map((item) => item.id === record.id ? { ...item, status: 'rejected', updatedAt: timestamp } : item) }
      }
      if (node.rejectStrategy === 'initiator') {
        return { ...next, runtimeRecords: next.runtimeRecords.map((item) => item.id === record.id ? { ...item, status: 'returned', currentNodeId: flow.nodes.find((item) => item.type === 'start')?.id, updatedAt: timestamp } : item) }
      }
      let targetId = node.rejectTargetNodeId
      if (node.rejectStrategy === 'previous') {
        const index = flow.nodes.findIndex((item) => item.id === node.id)
        const previous = flow.nodes.slice(0, index).reverse().find((item) => item.type === 'approval' || item.type === 'start')
        if (!previous || previous.type === 'start') {
          return { ...next, runtimeRecords: next.runtimeRecords.map((item) => item.id === record.id ? { ...item, status: 'returned', currentNodeId: previous?.id, updatedAt: timestamp } : item) }
        }
        targetId = previous.id
      }
      return advanceRuntime(next, flow, record, targetId, currentUser.name)
    })
    return { ok: true, recordId: record.id }
  }

  const restoreSample = async () => {
    if (!activeApp || loadedAppIdRef.current !== activeApp.id) return
    const sample = { ...createSeedWorkspace(), ownerAppId: activeApp.id, appName: activeApp.name, appDescription: activeApp.description }
    setWorkspace(sample)
    await saveWorkspace(sample, activeApp.id)
  }

  const clearSandbox = async () => {
    if (!activeApp || loadedAppIdRef.current !== activeApp.id) return
    const empty = { ...workspace, ownerAppId: activeApp.id, requests: [], tasks: [], audit: [], runtimeRecords: [], runtimeTasks: [], runtimeAudit: [], lastSavedAt: now() }
    setWorkspace(empty)
    await clearWorkspace(activeApp.id)
    await saveWorkspace(empty, activeApp.id)
  }

  const importWorkspace = (state: WorkspaceState) => {
    const targetAppId = activeAppIdRef.current
    if (!targetAppId || loadedAppIdRef.current !== targetAppId) return
    setWorkspace({ ...migrateWorkspace(state), ownerAppId: targetAppId, appName: activeApp?.name ?? state.appName, appDescription: activeApp?.description ?? state.appDescription, lastSavedAt: now() })
  }

  const isReady = ready && Boolean(activeApp) && loadedAppId === activeApp?.id && workspace.ownerAppId === activeApp?.id

  const value = useMemo<WorkspaceContextValue>(() => ({
    workspace, ready: isReady, saveState, updateObject, addObject, deleteObject, updatePage, addPage, deletePage, updateService, addService, deleteService, updateFlow, addFlow, deleteFlow,
    publish, submitRequest, decideTask, submitRuntimeRecord, decideRuntimeTask, restoreSample, clearSandbox, importWorkspace,
  }), [workspace, isReady, saveState, activeApp?.id, currentUser?.id, currentUser?.roles.join('|')])

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return context
}
