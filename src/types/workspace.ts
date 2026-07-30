export type FieldType = 'text' | 'number' | 'currency' | 'date' | 'enum' | 'boolean'

export interface ModelField {
  id: string
  name: string
  code: string
  type: FieldType
  required: boolean
  options?: string[]
}

export interface DataObject {
  id: string
  name: string
  code: string
  description: string
  fields: ModelField[]
  updatedAt: string
}

export type ComponentType = 'container' | 'heading' | 'text' | 'input' | 'currency' | 'select' | 'date' | 'button' | 'table'

export interface PageComponent {
  id: string
  type: ComponentType
  label: string
  binding?: string
  width: 'full' | 'half' | 'third'
  placeholder?: string
}

export interface PageSchema {
  id: string
  name: string
  route: string
  description: string
  objectId: string
  components: PageComponent[]
  updatedAt: string
}

export interface ServiceDefinition {
  id: string
  name: string
  code: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  type: 'object' | 'mock'
  objectId?: string
  description: string
  mockResponse: Record<string, unknown>
}

export type FlowNodeType = 'start' | 'approval' | 'condition' | 'service' | 'end'
export type RejectStrategy = 'previous' | 'initiator' | 'terminate' | 'node'
export type EndResult = 'completed' | 'approved' | 'rejected'

export interface FlowNode {
  id: string
  type: FlowNodeType
  name: string
  pageId?: string
  actionComponentId?: string
  assigneeRole?: UserRole
  condition?: string
  serviceId?: string
  nextNodeId?: string
  approveTargetNodeId?: string
  rejectStrategy?: RejectStrategy
  rejectTargetNodeId?: string
  trueTargetNodeId?: string
  falseTargetNodeId?: string
  failureTargetNodeId?: string
  endResult?: EndResult
}

export interface FlowDefinition {
  id: string
  name: string
  code: string
  description: string
  objectId: string
  nodes: FlowNode[]
  updatedAt: string
}

export interface ReleaseSnapshot {
  id: string
  version: string
  note: string
  createdAt: string
  snapshot: {
    objects: DataObject[]
    pages: PageSchema[]
    services: ServiceDefinition[]
    flows: FlowDefinition[]
  }
}

export type UserRole = 'applicant' | 'department_manager' | 'finance'
export type RequestStatus = 'draft' | 'pending_department' | 'pending_finance' | 'approved' | 'rejected'

export interface PurchaseRequest {
  id: string
  requestNo: string
  title: string
  category: string
  amount: number
  supplier: string
  reason: string
  applicant: string
  department: string
  status: RequestStatus
  createdAt: string
  updatedAt: string
}

export interface ApprovalTask {
  id: string
  requestId: string
  nodeName: string
  role: UserRole
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  completedAt?: string
  comment?: string
}

export interface AuditEvent {
  id: string
  requestId: string
  action: string
  actor: string
  detail: string
  createdAt: string
}

export type RuntimeRecordStatus = 'running' | 'returned' | 'completed' | 'approved' | 'rejected'

export interface RuntimeRecord {
  id: string
  recordNo: string
  objectId: string
  pageId: string
  flowId: string
  data: Record<string, unknown>
  status: RuntimeRecordStatus
  currentNodeId?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface RuntimeFlowTask {
  id: string
  recordId: string
  flowId: string
  nodeId: string
  nodeName: string
  pageId?: string
  role: UserRole
  status: 'pending' | 'approved' | 'returned' | 'rejected'
  createdAt: string
  completedAt?: string
  comment?: string
}

export interface RuntimeFlowAudit {
  id: string
  recordId: string
  flowId: string
  nodeId?: string
  action: string
  actor: string
  detail: string
  createdAt: string
}

export interface WorkspaceState {
  schemaVersion: number
  ownerAppId?: string
  appName: string
  appDescription: string
  objects: DataObject[]
  pages: PageSchema[]
  services: ServiceDefinition[]
  flows: FlowDefinition[]
  releases: ReleaseSnapshot[]
  requests: PurchaseRequest[]
  tasks: ApprovalTask[]
  audit: AuditEvent[]
  runtimeRecords: RuntimeRecord[]
  runtimeTasks: RuntimeFlowTask[]
  runtimeAudit: RuntimeFlowAudit[]
  lastSavedAt: string
}
