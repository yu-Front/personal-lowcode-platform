import type { FlowDefinition, FlowNode, PageSchema, WorkspaceState } from '../types/workspace'

const matchingPage = (pages: PageSchema[], objectId: string) => pages.find((page) => page.objectId === objectId)

function migrateFlow(flow: FlowDefinition, pages: PageSchema[]): FlowDefinition {
  const defaultPage = matchingPage(pages, flow.objectId)
  const originalNodes = flow.nodes
  const nodes = originalNodes.map((node, index): FlowNode => {
    const next = originalNodes[index + 1]
    const afterNext = originalNodes[index + 2]
    if (node.type === 'start') {
      const page = pages.find((item) => item.id === node.pageId) ?? defaultPage
      return {
        ...node,
        pageId: page?.id,
        actionComponentId: node.actionComponentId ?? page?.components.find((component) => component.type === 'button')?.id,
        nextNodeId: node.nextNodeId ?? next?.id,
      }
    }
    if (node.type === 'approval') {
      return {
        ...node,
        pageId: node.pageId ?? defaultPage?.id,
        approveTargetNodeId: node.approveTargetNodeId ?? next?.id,
        rejectStrategy: node.rejectStrategy ?? 'terminate',
      }
    }
    if (node.type === 'condition') {
      return {
        ...node,
        trueTargetNodeId: node.trueTargetNodeId ?? next?.id,
        falseTargetNodeId: node.falseTargetNodeId ?? afterNext?.id ?? next?.id,
      }
    }
    if (node.type === 'service') {
      return { ...node, nextNodeId: node.nextNodeId ?? next?.id }
    }
    return { ...node, endResult: node.endResult ?? 'completed' }
  })
  return { ...flow, nodes }
}

export function migrateWorkspace(workspace: WorkspaceState): WorkspaceState {
  const releases = (workspace.releases ?? []).map((release) => {
    const pages = release.snapshot.pages ?? []
    const note = release.note === '完成采购申请页面与审批流程配置' && !workspace.appName.includes('采购')
      ? `完成${workspace.appName}页面与流程配置`
      : release.note

    return {
      ...release,
      note,
      snapshot: {
        ...release.snapshot,
        objects: release.snapshot.objects ?? [],
        pages,
        services: release.snapshot.services ?? [],
        flows: (release.snapshot.flows ?? []).map((flow) => migrateFlow(flow, pages)),
      },
    }
  })

  return {
    ...workspace,
    schemaVersion: 3,
    flows: workspace.flows.map((flow) => migrateFlow(flow, workspace.pages)),
    releases,
    runtimeRecords: workspace.runtimeRecords ?? [],
    runtimeTasks: workspace.runtimeTasks ?? [],
    runtimeAudit: workspace.runtimeAudit ?? [],
  }
}
