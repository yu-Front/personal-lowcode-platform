import type { WorkspaceState } from '../types/workspace'

export type DeletableResource = 'object' | 'page' | 'flow' | 'service'

export interface ResourceReference {
  ownerType: 'page' | 'service' | 'flow'
  ownerId: string
  ownerName: string
  location: string
}

export function findResourceReferences(workspace: WorkspaceState, resource: DeletableResource, resourceId: string): ResourceReference[] {
  if (resource === 'flow') return []
  if (resource === 'object') {
    const pageReferences = (workspace.pages ?? []).filter((page) => page.objectId === resourceId).map((page) => ({ ownerType: 'page' as const, ownerId: page.id, ownerName: page.name, location: '业务对象绑定' }))
    const serviceReferences = (workspace.services ?? []).filter((service) => service.objectId === resourceId).map((service) => ({ ownerType: 'service' as const, ownerId: service.id, ownerName: service.name, location: '业务对象绑定' }))
    const flowReferences = (workspace.flows ?? []).filter((flow) => flow.objectId === resourceId).map((flow) => ({ ownerType: 'flow' as const, ownerId: flow.id, ownerName: flow.name, location: '业务对象绑定' }))
    return [...pageReferences, ...serviceReferences, ...flowReferences]
  }
  return (workspace.flows ?? []).flatMap((flow) => flow.nodes.flatMap((node) => {
    const referenced = resource === 'page' ? node.pageId === resourceId : node.serviceId === resourceId
    return referenced ? [{ ownerType: 'flow' as const, ownerId: flow.id, ownerName: flow.name, location: `节点「${node.name}」` }] : []
  }))
}

export function referenceMessage(resourceLabel: string, references: ResourceReference[]) {
  const ownerLabels = { page: '页面', service: '服务', flow: '流程' }
  const locations = references.map((reference) => `${ownerLabels[reference.ownerType]}「${reference.ownerName}」的${reference.location}`).join('、')
  return `无法删除${resourceLabel}：已被${locations}引用。请先解除这些绑定后再删除。`
}
