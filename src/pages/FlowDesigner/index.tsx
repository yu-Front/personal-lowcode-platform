import {
  ArrowRight, BadgeCheck, CircleDot, Diamond, FileInput, GitBranch, LoaderCircle, Play, Plus, Save,
  ServerCog, ShieldCheck, Trash2, Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import ConfirmDialog from '../../components/ConfirmDialog'
import NoticeDialog from '../../components/NoticeDialog'
import PageHeader from '../../components/PageHeader'
import { findResourceReferences, referenceMessage } from '../../domain/dependencyGraph'
import { validateFlow } from '../../domain/workflowEngine.js'
import { useWorkspace } from '../../state/WorkspaceContext'
import type { EndResult, FlowDefinition, FlowNode, FlowNodeType, RejectStrategy, UserRole } from '../../types/workspace'
import { delay } from '../../utils/async'

const nodeMeta: Record<FlowNodeType, { label: string; icon: typeof Play; tone: string; ring: string }> = {
  start: { label: '开始', icon: Play, tone: 'bg-accent-500 text-white', ring: 'ring-accent-200' },
  approval: { label: '审批', icon: Users, tone: 'bg-primary-600 text-white', ring: 'ring-primary-200' },
  condition: { label: '条件', icon: Diamond, tone: 'bg-amber-500 text-white', ring: 'ring-amber-200' },
  service: { label: '服务', icon: ServerCog, tone: 'bg-cyan-600 text-white', ring: 'ring-cyan-200' },
  end: { label: '结束', icon: BadgeCheck, tone: 'bg-secondary-700 text-white', ring: 'ring-secondary-300' },
}

const roleLabels: Record<UserRole, string> = { applicant: '申请人', department_manager: '部门经理', finance: '财务审批人' }
const rejectLabels: Record<RejectStrategy, string> = { previous: '退回上一步', initiator: '退回发起人修改', terminate: '直接结束流程', node: '退回指定节点' }
const endLabels: Record<EndResult, string> = { completed: '正常完成', approved: '审批通过', rejected: '审批拒绝' }

const primaryTarget = (node: FlowNode) => node.type === 'approval' ? node.approveTargetNodeId : node.type === 'condition' ? node.trueTargetNodeId : node.nextNodeId
const withPrimaryTarget = (node: FlowNode, targetId?: string): FlowNode => {
  if (node.type === 'approval') return { ...node, approveTargetNodeId: targetId }
  if (node.type === 'condition') return { ...node, trueTargetNodeId: targetId }
  return { ...node, nextNodeId: targetId }
}

export default function FlowDesigner() {
  const { workspace, saveState, updateFlow, addFlow, deleteFlow } = useWorkspace()
  const [flowId, setFlowId] = useState(workspace.flows[0]?.id ?? '')
  const source = workspace.flows.find((flow) => flow.id === flowId) ?? workspace.flows[0]
  const emptyFlow: FlowDefinition = { id: '', name: '', code: '', description: '', objectId: '', nodes: [], updatedAt: '' }
  const [draft, setDraft] = useState<FlowDefinition>(source ? structuredClone(source) : emptyFlow)
  const [selectedId, setSelectedId] = useState(source?.nodes[1]?.id ?? source?.nodes[0]?.id ?? '')
  const [saved, setSaved] = useState(false)
  const [notice, setNotice] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [nodeDeleteTarget, setNodeDeleteTarget] = useState<FlowNode | null>(null)

  useEffect(() => {
    if (source) {
      setFlowId(source.id)
      setDraft(structuredClone(source))
      setSelectedId(source.nodes[1]?.id ?? source.nodes[0]?.id ?? '')
    }
  }, [source?.id])

  const selected = useMemo(() => draft.nodes.find((node) => node.id === selectedId), [draft.nodes, selectedId])
  const boundObject = workspace.objects.find((object) => object.id === draft.objectId)
  const availablePages = workspace.pages.filter((page) => page.objectId === draft.objectId)
  const flowIssues = validateFlow(draft, workspace) as string[]
  const nodeName = (id?: string) => draft.nodes.find((node) => node.id === id)?.name ?? '未配置'
  const pageName = (id?: string) => workspace.pages.find((page) => page.id === id)?.name ?? '未绑定页面'
  const updateSelected = (patch: Partial<FlowNode>) => setDraft({ ...draft, nodes: draft.nodes.map((node) => node.id === selectedId ? { ...node, ...patch } : node) })

  const addNode = (type: FlowNodeType) => {
    const endIndex = draft.nodes.findIndex((item) => item.type === 'end')
    const insertIndex = endIndex < 0 ? draft.nodes.length : endIndex
    const nextNode = draft.nodes[insertIndex]
    const page = availablePages[0]
    const node: FlowNode = {
      id: `node_${crypto.randomUUID()}`,
      type,
      name: type === 'approval' ? '新审批节点' : `新${nodeMeta[type].label}节点`,
      ...(type === 'approval' ? { assigneeRole: 'department_manager' as UserRole, pageId: page?.id, approveTargetNodeId: nextNode?.id, rejectStrategy: 'previous' as RejectStrategy } : {}),
      ...(type === 'condition' ? { condition: '', trueTargetNodeId: nextNode?.id, falseTargetNodeId: nextNode?.id } : {}),
      ...(type === 'service' ? { serviceId: workspace.services[0]?.id, nextNodeId: nextNode?.id } : {}),
    }
    const nodes = [...draft.nodes]
    const previous = nodes[insertIndex - 1]
    if (previous && primaryTarget(previous) === nextNode?.id) nodes[insertIndex - 1] = withPrimaryTarget(previous, node.id)
    nodes.splice(insertIndex, 0, node)
    setDraft({ ...draft, nodes })
    setSelectedId(node.id)
  }

  const deleteSelected = () => {
    if (!selected || selected.type === 'start' || selected.type === 'end') return
    const fallback = primaryTarget(selected)
    const nodes = draft.nodes.filter((node) => node.id !== selected.id).map((node): FlowNode => ({
      ...node,
      nextNodeId: node.nextNodeId === selected.id ? fallback : node.nextNodeId,
      approveTargetNodeId: node.approveTargetNodeId === selected.id ? fallback : node.approveTargetNodeId,
      rejectTargetNodeId: node.rejectTargetNodeId === selected.id ? fallback : node.rejectTargetNodeId,
      trueTargetNodeId: node.trueTargetNodeId === selected.id ? fallback : node.trueTargetNodeId,
      falseTargetNodeId: node.falseTargetNodeId === selected.id ? fallback : node.falseTargetNodeId,
      failureTargetNodeId: node.failureTargetNodeId === selected.id ? fallback : node.failureTargetNodeId,
    }))
    setDraft({ ...draft, nodes })
    setSelectedId(nodes.find((node) => node.id === fallback)?.id ?? nodes[0]?.id ?? '')
    setNodeDeleteTarget(null)
  }

  const save = () => {
    updateFlow(draft)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1600)
  }
  const createFlow = () => { const id = addFlow(); if (id) { setFlowId(id); setNotice('') } }
  const removeFlow = () => {
    const references = findResourceReferences(workspace, 'flow', draft.id)
    if (references.length) { setNotice(referenceMessage(`流程「${draft.name}」`, references)); return }
    setConfirmOpen(true)
  }
  const confirmRemoveFlow = async () => {
    if (deleting) return
    setDeleting(true)
    await delay()
    const nextId = workspace.flows.find((flow) => flow.id !== draft.id)?.id ?? ''
    const result = deleteFlow(draft.id)
    if (!result.ok) { setNotice(referenceMessage(`流程「${draft.name}」`, result.references)); setDeleting(false); setConfirmOpen(false); return }
    setNotice('')
    setFlowId(nextId)
    setSelectedId('')
    setDeleting(false)
    setConfirmOpen(false)
  }

  const targetOptions = (currentId: string) => draft.nodes.filter((node) => node.id !== currentId && node.type !== 'start')
  const targetField = (label: string, value: string | undefined, onChange: (value: string | undefined) => void, optional = false) => (
    <label className="block"><span className="field-label">{label}</span><select className="field" value={value ?? ''} onChange={(event) => onChange(event.target.value || undefined)}><option value="">{optional ? '不配置' : '选择节点'}</option>{targetOptions(selected?.id ?? '').map((node) => <option key={node.id} value={node.id}>{node.name} · {nodeMeta[node.type].label}</option>)}</select></label>
  )

  const nodeSummary = (node: FlowNode) => {
    if (node.type === 'start') return `页面：${pageName(node.pageId)} · 操作：${workspace.pages.find((page) => page.id === node.pageId)?.components.find((component) => component.id === node.actionComponentId)?.label ?? '未绑定按钮'} · 下一步：${nodeName(node.nextNodeId)}`
    if (node.type === 'approval') return `处理人：${roleLabels[node.assigneeRole ?? 'department_manager']} · 任务页面：${pageName(node.pageId)} · 驳回：${rejectLabels[node.rejectStrategy ?? 'terminate']}`
    if (node.type === 'condition') return `表达式：${node.condition || '未配置'} · 是 → ${nodeName(node.trueTargetNodeId)} · 否 → ${nodeName(node.falseTargetNodeId)}`
    if (node.type === 'service') return `调用：${workspace.services.find((service) => service.id === node.serviceId)?.name ?? '未选择服务'} · 成功 → ${nodeName(node.nextNodeId)}`
    return `结束结果：${endLabels[node.endResult ?? 'completed']}`
  }

  if (!source) return <div className="page-shell"><PageHeader eyebrow="Process Orchestrator" title="流程设计器" description="为业务对象创建审批与自动化流程。" actions={<button className="btn-primary" disabled={!workspace.objects.length} onClick={createFlow}><Plus size={16} />新建流程</button>} /><div className="empty-state app-card min-h-[460px]"><GitBranch size={34} className="text-secondary-300" /><h2 className="mt-4 font-semibold text-secondary-900">还没有流程</h2><p className="mt-2 max-w-md text-sm leading-6 text-secondary-500">{workspace.objects.length ? '创建流程后，可绑定触发页面、审批页面和节点流向。' : '流程需要关联业务对象，请先创建数据对象。'}</p></div></div>

  const startNode = draft.nodes.find((node) => node.type === 'start')
  const approvalNodes = draft.nodes.filter((node) => node.type === 'approval')
  const uniqueRoles = [...new Set(approvalNodes.map((node) => node.assigneeRole).filter(Boolean))] as UserRole[]

  return (
    <div className="page-shell max-w-none">
      <ConfirmDialog open={confirmOpen} title="删除流程" description={`确定删除「${draft.name}」吗？流程节点、条件分支和审批配置都会一并移除。`} busy={deleting} onCancel={() => setConfirmOpen(false)} onConfirm={confirmRemoveFlow} />
      <ConfirmDialog open={nodeDeleteTarget !== null} title="删除流程节点" description={`确定删除节点「${nodeDeleteTarget?.name ?? ''}」吗？指向该节点的主流程连线会自动连接到它的下一节点。`} confirmText="删除节点" onCancel={() => setNodeDeleteTarget(null)} onConfirm={deleteSelected} />
      <PageHeader eyebrow="Process Orchestrator" title="流程设计器" description="为任意业务应用配置页面触发、审批任务、条件分支、服务调用，以及同意和驳回流向。" actions={<><select className="field min-w-44 py-2" value={source.id} onChange={(event) => { setFlowId(event.target.value); setNotice('') }} aria-label="切换设计流程">{workspace.flows.map((flow) => <option key={flow.id} value={flow.id}>{flow.name}</option>)}</select><button className="btn-secondary" disabled={saveState === 'saving'} onClick={createFlow}><Plus size={16} />新建流程</button><button className="btn-danger" disabled={saveState === 'saving'} onClick={removeFlow}><Trash2 size={16} />删除流程</button><button className="btn-primary" disabled={saveState === 'saving'} onClick={save} aria-busy={saveState === 'saving'}>{saveState === 'saving' ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}{saveState === 'saving' ? '正在保存…' : saved ? '已保存' : '保存流程'}</button></>} />
      <NoticeDialog open={Boolean(notice)} title="流程暂时无法删除" description={notice} onClose={() => setNotice('')} />
      <div className="grid min-h-[700px] gap-4 2xl:grid-cols-[240px_minmax(700px,1fr)_330px]">
        <aside className="app-card overflow-hidden">
          <div className="panel-header"><div><h2 className="section-title">流程节点</h2><p className="mt-1 text-xs text-secondary-500">点击加入主流程</p></div><GitBranch size={18} className="text-primary-600" /></div>
          <div className="space-y-2 p-3">{(['approval', 'condition', 'service'] as FlowNodeType[]).map((type) => { const meta = nodeMeta[type]; return <button key={type} onClick={() => addNode(type)} className="group flex w-full items-center gap-3 rounded-xl border border-secondary-100 bg-secondary-50 p-3 text-left transition hover:border-primary-200 hover:bg-primary-50"><span className={`grid h-9 w-9 place-items-center rounded-xl ${meta.tone}`}><meta.icon size={17} /></span><span><strong className="block text-sm text-secondary-800">{meta.label}节点</strong><small className="text-[11px] text-secondary-400">{type === 'approval' ? '人工审批与退回' : type === 'condition' ? '配置真假分支' : '调用业务服务'}</small></span><Plus size={15} className="ml-auto text-secondary-300 group-hover:text-primary-500" /></button> })}</div>
          <div className={`mx-3 mt-2 rounded-xl border p-3 text-xs leading-5 ${flowIssues.length ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-accent-200 bg-accent-50 text-accent-800'}`}><strong className="block">{flowIssues.length ? `${flowIssues.length} 项待配置` : '流程配置完整'}</strong>{flowIssues[0] ?? '每个节点的页面与流向都已有效绑定。'}</div>
        </aside>

        <section className="app-card overflow-hidden bg-secondary-100">
          <div className="flex flex-wrap items-center gap-3 border-b border-secondary-200 bg-white px-5 py-3"><div className="mr-auto min-w-48"><input className="w-full border-0 bg-transparent text-sm font-semibold text-secondary-900 outline-none" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /><div className="mt-0.5 font-mono text-[10px] text-secondary-400">{draft.code}</div></div><label className="flex items-center gap-2 text-xs text-secondary-500"><span>业务对象</span><select className="field w-40 py-2" value={draft.objectId} onChange={(event) => setDraft({ ...draft, objectId: event.target.value })}>{workspace.objects.map((object) => <option key={object.id} value={object.id}>{object.name}</option>)}</select></label><span className={flowIssues.length ? 'badge-amber' : 'badge-green'}><CircleDot size={12} />{flowIssues.length ? '待完善' : '流程有效'}</span><span className="badge-gray">{draft.nodes.length} 节点</span></div>
          <div className="min-h-[640px] overflow-auto p-6 sm:p-10">
            <div className="mx-auto min-w-[680px] max-w-4xl rounded-2xl border border-secondary-200 bg-white p-7 shadow-panel">
              <div className="mb-8 flex items-center justify-between"><div><div className="eyebrow">Main Process</div><h3 className="mt-2 text-lg font-semibold text-secondary-900">{draft.name || '未命名流程'}</h3><p className="mt-1 text-xs text-secondary-500">{draft.description || `处理${boundObject?.name ?? '业务对象'}的提交与审批`}</p></div><div className="flex -space-x-2">{uniqueRoles.length ? uniqueRoles.map((role) => <span key={role} title={roleLabels[role]} className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-primary-100 text-[10px] font-bold text-primary-700">{roleLabels[role].slice(0, 1)}</span>) : <span className="badge-gray">尚无审批角色</span>}</div></div>
              <div className="relative ml-5 border-l-2 border-secondary-200 pl-10">{draft.nodes.map((node, index) => { const meta = nodeMeta[node.type]; return <div key={node.id} className="relative pb-7 last:pb-0"><button onClick={() => setSelectedId(node.id)} className={`absolute -left-[61px] top-0 grid h-10 w-10 place-items-center rounded-xl shadow-sm ring-4 ${meta.tone} ${selectedId === node.id ? meta.ring : 'ring-white'}`}><meta.icon size={17} /></button><button onClick={() => setSelectedId(node.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedId === node.id ? 'border-primary-300 bg-primary-50 shadow-sm' : 'border-secondary-200 bg-white hover:border-primary-200'}`}><div className="flex items-center gap-3"><span className="text-xs font-semibold text-secondary-400">{String(index + 1).padStart(2, '0')}</span><strong className="text-sm text-secondary-900">{node.name}</strong><span className="ml-auto badge-gray">{meta.label}</span></div><div className="mt-2 pl-8 text-xs leading-5 text-secondary-500">{nodeSummary(node)}</div></button></div> })}</div>
              <div className="mt-8 grid gap-3 rounded-2xl bg-secondary-900 p-4 text-white sm:grid-cols-3"><div><small className="text-secondary-400">触发页面</small><div className="mt-1 truncate text-sm">{pageName(startNode?.pageId)}</div></div><div><small className="text-secondary-400">业务对象</small><div className="mt-1 truncate text-sm">{boundObject?.name ?? '未绑定'}</div></div><div><small className="text-secondary-400">审批策略</small><div className="mt-1 text-sm">{approvalNodes.length ? `${approvalNodes.length} 个人工节点` : '无人工审批'}</div></div></div>
            </div>
          </div>
        </section>

        <aside className="app-card overflow-hidden">
          <div className="panel-header"><div><h2 className="section-title">节点配置</h2><p className="mt-1 text-xs text-secondary-500">绑定页面、动作和节点流向</p></div></div>
          {selected ? <div className="space-y-4 p-4"><div className="rounded-xl bg-secondary-900 p-4 text-white"><div className="flex items-center gap-3"><span className={`grid h-9 w-9 place-items-center rounded-xl ${nodeMeta[selected.type].tone}`}><ShieldCheck size={17} /></span><div><small className="text-secondary-400">当前节点</small><div className="text-sm font-medium">{nodeMeta[selected.type].label}节点</div></div></div></div>
            <label className="block"><span className="field-label">节点名称</span><input className="field" value={selected.name} onChange={(event) => updateSelected({ name: event.target.value })} /></label>
            {selected.type === 'start' && <>
              <label className="block"><span className="field-label">触发页面</span><select className="field" value={selected.pageId ?? ''} onChange={(event) => updateSelected({ pageId: event.target.value || undefined, actionComponentId: undefined })}><option value="">选择页面</option>{availablePages.map((page) => <option key={page.id} value={page.id}>{page.name}</option>)}</select></label>
              <label className="block"><span className="field-label">页面提交按钮</span><select className="field" value={selected.actionComponentId ?? ''} onChange={(event) => updateSelected({ actionComponentId: event.target.value || undefined })}><option value="">选择按钮</option>{workspace.pages.find((page) => page.id === selected.pageId)?.components.filter((component) => component.type === 'button').map((component) => <option key={component.id} value={component.id}>{component.label}</option>)}</select></label>
              {targetField('提交后进入', selected.nextNodeId, (value) => updateSelected({ nextNodeId: value }))}
              <div className="rounded-xl border border-primary-100 bg-primary-50 p-3 text-xs leading-5 text-primary-700"><FileInput size={15} className="mb-1" />用户点击所选页面按钮时，页面数据会写入绑定对象并启动该流程。</div>
            </>}
            {selected.type === 'approval' && <>
              <label className="block"><span className="field-label">审批角色</span><select className="field" value={selected.assigneeRole ?? 'department_manager'} onChange={(event) => updateSelected({ assigneeRole: event.target.value as UserRole })}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="block"><span className="field-label">审批任务页面</span><select className="field" value={selected.pageId ?? ''} onChange={(event) => updateSelected({ pageId: event.target.value || undefined })}><option value="">选择页面</option>{availablePages.map((page) => <option key={page.id} value={page.id}>{page.name}</option>)}</select></label>
              {targetField('同意后进入', selected.approveTargetNodeId, (value) => updateSelected({ approveTargetNodeId: value }))}
              <label className="block"><span className="field-label">驳回处理</span><select className="field" value={selected.rejectStrategy ?? 'previous'} onChange={(event) => updateSelected({ rejectStrategy: event.target.value as RejectStrategy, rejectTargetNodeId: undefined })}>{Object.entries(rejectLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              {selected.rejectStrategy === 'node' && targetField('驳回目标节点', selected.rejectTargetNodeId, (value) => updateSelected({ rejectTargetNodeId: value }))}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800"><strong>当前动作</strong><br />同意 <ArrowRight size={12} className="inline" /> {nodeName(selected.approveTargetNodeId)}<br />驳回 <ArrowRight size={12} className="inline" /> {rejectLabels[selected.rejectStrategy ?? 'previous']}{selected.rejectStrategy === 'node' ? `（${nodeName(selected.rejectTargetNodeId)}）` : ''}</div>
            </>}
            {selected.type === 'condition' && <>
              <label className="block"><span className="field-label">条件表达式</span><input className="field font-mono" value={selected.condition ?? ''} onChange={(event) => updateSelected({ condition: event.target.value })} placeholder="例如：days > 3" /></label>
              <div className="flex flex-wrap gap-1.5">{boundObject?.fields.map((field) => <button key={field.id} type="button" onClick={() => updateSelected({ condition: `${field.code} ` })} className="rounded-md bg-secondary-100 px-2 py-1 font-mono text-[10px] text-secondary-600">{field.code}</button>)}</div>
              {targetField('条件为是', selected.trueTargetNodeId, (value) => updateSelected({ trueTargetNodeId: value }))}
              {targetField('条件为否', selected.falseTargetNodeId, (value) => updateSelected({ falseTargetNodeId: value }))}
            </>}
            {selected.type === 'service' && <>
              <label className="block"><span className="field-label">调用服务</span><select className="field" value={selected.serviceId ?? ''} onChange={(event) => updateSelected({ serviceId: event.target.value || undefined })}><option value="">选择服务</option>{workspace.services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
              {targetField('成功后进入', selected.nextNodeId, (value) => updateSelected({ nextNodeId: value }))}
              {targetField('失败后进入', selected.failureTargetNodeId, (value) => updateSelected({ failureTargetNodeId: value }), true)}
            </>}
            {selected.type === 'end' && <label className="block"><span className="field-label">流程结果</span><select className="field" value={selected.endResult ?? 'completed'} onChange={(event) => updateSelected({ endResult: event.target.value as EndResult })}>{Object.entries(endLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
            {!['start', 'end'].includes(selected.type) && <button className="btn-danger w-full" onClick={() => setNodeDeleteTarget(selected)}><Trash2 size={16} />删除节点</button>}
          </div> : <div className="empty-state m-4"><GitBranch size={28} className="text-secondary-300" /><p className="mt-3 text-sm text-secondary-500">选择节点进行配置</p></div>}
        </aside>
      </div>
    </div>
  )
}
