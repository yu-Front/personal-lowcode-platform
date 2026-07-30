import {
  Check, ClipboardList, FileInput, Gauge, Inbox, ListChecks, Route as RouteIcon, Send, Undo2,
} from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Navigate, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { usePlatform } from '../../state/PlatformContext'
import { useWorkspace } from '../../state/WorkspaceContext'
import type { PageComponent, RuntimeRecordStatus, UserRole } from '../../types/workspace'

const roleLabels: Record<UserRole, string> = { applicant: '申请人', department_manager: '部门经理', finance: '财务审批人' }
const statusLabels: Record<RuntimeRecordStatus, string> = { running: '审批中', returned: '已退回', completed: '已完成', approved: '已通过', rejected: '已拒绝' }
const statusTone: Record<RuntimeRecordStatus, string> = { running: 'badge-amber', returned: 'badge-red', completed: 'badge-green', approved: 'badge-green', rejected: 'badge-red' }
const displayValue = (value: unknown) => typeof value === 'boolean' ? (value ? '是' : '否') : value == null || value === '' ? '—' : String(value)

export default function GenericRuntime() {
  const { workspace } = useWorkspace()
  const { currentUser } = usePlatform()
  const release = workspace.releases[0]
  const config = release?.snapshot ?? workspace
  const startPageIds = new Set(config.flows.flatMap((flow) => flow.nodes.filter((node) => node.type === 'start' && node.pageId).map((node) => node.pageId as string)))
  const runnablePages = config.pages.filter((page) => startPageIds.has(page.id))
  const pending = workspace.runtimeTasks.filter((task) => task.status === 'pending' && currentUser?.roles.includes(task.role)).length
  const links = [
    { to: '/runtime/overview', label: '运行概览', icon: Gauge },
    ...(currentUser?.roles.includes('applicant') ? [{ to: '/runtime/forms', label: '发起业务', icon: FileInput }] : []),
    { to: '/runtime/tasks', label: '我的待办', icon: ListChecks },
    { to: '/runtime/traces', label: '流程轨迹', icon: RouteIcon },
  ]

  return <div className="min-h-[calc(100vh-4rem)] bg-white">
    <div className="border-b border-secondary-200 bg-secondary-50"><div className="mx-auto max-w-[1500px] px-4 pt-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="eyebrow">Published Application</div><h1 className="mt-2 text-2xl font-semibold text-secondary-900">{workspace.appName}</h1><p className="mt-1 text-sm text-secondary-500">{workspace.appDescription || '由页面、对象与流程配置生成的运行态应用'}</p></div><div className={`rounded-2xl border px-4 py-3 text-xs ${release ? 'border-accent-200 bg-accent-50 text-accent-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}><strong>{release ? `运行版本 ${release.version}` : '尚未发布'}</strong><div className="mt-1 opacity-75">{release ? '读取当前应用最新发布快照' : '请先前往发布中心生成版本'}</div></div></div>
      <nav className="mt-6 flex gap-1 overflow-x-auto pb-px">{links.map((link) => <NavLink key={link.to} to={link.to} className={({ isActive }) => `relative flex shrink-0 items-center gap-2 rounded-t-xl px-3 py-3 text-sm font-medium transition sm:px-4 ${isActive ? 'bg-white text-primary-700 shadow-[0_-1px_0_0_theme(colors.secondary.200),1px_0_0_0_theme(colors.secondary.200),-1px_0_0_0_theme(colors.secondary.200)]' : 'text-secondary-500 hover:bg-white/60 hover:text-secondary-900'}`}><link.icon size={16} />{link.label}{link.to.endsWith('/tasks') && pending > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] text-white">{pending}</span>}</NavLink>)}</nav>
    </div></div>
    <Routes>
      <Route path="overview" element={<GenericOverview />} />
      <Route path="forms" element={<FormCatalog runnablePageIds={runnablePages.map((page) => page.id)} />} />
      <Route path="forms/:pageId" element={<DynamicRuntimeForm />} />
      <Route path="tasks" element={<GenericTaskCenter />} />
      <Route path="traces" element={<GenericTraceCenter />} />
      <Route path="*" element={<Navigate to="overview" replace />} />
    </Routes>
  </div>
}

function GenericOverview() {
  const { workspace } = useWorkspace()
  const { currentUser } = usePlatform()
  const config = workspace.releases[0]?.snapshot ?? workspace
  const stats = [
    ['全部业务', workspace.runtimeRecords.length, 'text-primary-700 bg-primary-50'],
    ['审批中', workspace.runtimeRecords.filter((item) => item.status === 'running').length, 'text-amber-700 bg-amber-50'],
    ['已完成', workspace.runtimeRecords.filter((item) => ['completed', 'approved'].includes(item.status)).length, 'text-accent-700 bg-accent-50'],
    ['我的待办', workspace.runtimeTasks.filter((item) => item.status === 'pending' && currentUser?.roles.includes(item.role)).length, 'text-red-700 bg-red-50'],
  ]
  const flow = config.flows[0]
  return <div className="page-shell max-w-[1500px]"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label, value, tone]) => <div key={String(label)} className="app-card p-5"><div className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ${tone}`}>{label}</div><div className="mt-4 text-3xl font-semibold text-secondary-900">{value}</div><div className="mt-2 text-xs text-secondary-400">当前应用 · 本机数据</div></div>)}</div><div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]"><RuntimeRecordList embedded /><div className="app-card p-5"><h2 className="section-title">{flow?.name ?? '流程说明'}</h2>{flow ? <div className="mt-5 space-y-0">{flow.nodes.map((node, index) => <div key={node.id} className="flex gap-3"><div className="flex flex-col items-center"><span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${index === 0 ? 'bg-primary-600 text-white' : 'bg-secondary-100 text-secondary-500'}`}>{index + 1}</span>{index < flow.nodes.length - 1 && <span className="h-8 w-px bg-secondary-200" />}</div><div className="pt-1"><div className="text-sm text-secondary-700">{node.name}</div><div className="mt-0.5 text-[11px] text-secondary-400">{node.type === 'approval' ? roleLabels[node.assigneeRole ?? 'department_manager'] : node.type === 'condition' ? node.condition : node.type === 'service' ? '自动服务' : node.type === 'start' ? '页面提交' : '完成'}</div></div></div>)}</div> : <div className="empty-state min-h-52"><RouteIcon size={28} className="text-secondary-300" /><p className="mt-3 text-sm text-secondary-500">发布版本中没有流程</p></div>}</div></div></div>
}

function RuntimeRecordList({ embedded = false }: { embedded?: boolean }) {
  const { workspace } = useWorkspace()
  const config = workspace.releases[0]?.snapshot ?? workspace
  return <section className="app-card overflow-hidden"><div className="panel-header"><div><h2 className="section-title">业务记录</h2><p className="mt-1 text-xs text-secondary-500">共 {workspace.runtimeRecords.length} 条</p></div><ClipboardList size={18} className="text-primary-600" /></div><div className="overflow-x-auto"><table className="data-table"><thead><tr><th>业务编号</th><th>业务对象</th><th>摘要</th><th>发起人</th><th>状态</th><th>更新时间</th></tr></thead><tbody>{workspace.runtimeRecords.map((record) => { const object = config.objects.find((item) => item.id === record.objectId); const summary = object?.fields.slice(0, 2).map((field) => displayValue(record.data[field.code])).join(' · ') || '—'; return <tr key={record.id}><td className="font-mono text-xs">{record.recordNo}</td><td>{object?.name ?? '未知对象'}</td><td>{summary}</td><td>{record.createdBy}</td><td><span className={statusTone[record.status]}>{statusLabels[record.status]}</span></td><td>{new Date(record.updatedAt).toLocaleString()}</td></tr> })}</tbody></table></div>{!workspace.runtimeRecords.length && <div className="empty-state m-5 min-h-48"><Inbox size={28} className="text-secondary-300" /><p className="mt-3 text-sm text-secondary-500">当前应用还没有业务记录</p></div>}{embedded && <div className="border-t border-secondary-100 px-5 py-3 text-right text-xs text-secondary-400">数据仅属于 {workspace.appName}</div>}</section>
}

function FormCatalog({ runnablePageIds }: { runnablePageIds: string[] }) {
  const { workspace } = useWorkspace()
  const config = workspace.releases[0]?.snapshot ?? workspace
  const pages = config.pages.filter((page) => runnablePageIds.includes(page.id))
  if (!workspace.releases.length) return <div className="page-shell"><div className="empty-state app-card min-h-80"><FileInput size={30} className="text-secondary-300" /><h2 className="mt-4 font-semibold">应用尚未发布</h2><p className="mt-2 text-sm text-secondary-500">发布后才能从运行态发起业务。</p></div></div>
  return <div className="page-shell max-w-5xl"><div className="mb-6"><div className="eyebrow">Published Forms</div><h2 className="page-title mt-2">发起业务</h2><p className="page-subtitle">选择已绑定流程开始节点的页面。</p></div><div className="grid gap-4 sm:grid-cols-2">{pages.map((page) => <NavLink key={page.id} to={`/runtime/forms/${page.id}`} className="app-card p-5 transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-float"><span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary-700"><FileInput size={20} /></span><h3 className="mt-4 font-semibold text-secondary-900">{page.name}</h3><p className="mt-2 text-sm leading-6 text-secondary-500">{page.description || '填写并提交业务表单'}</p></NavLink>)}</div>{!pages.length && <div className="empty-state app-card min-h-72"><FileInput size={30} className="text-secondary-300" /><p className="mt-3 text-sm text-secondary-500">没有页面绑定到流程开始节点</p></div>}</div>
}

function DynamicRuntimeForm() {
  const { pageId = '' } = useParams()
  const navigate = useNavigate()
  const { workspace, submitRuntimeRecord } = useWorkspace()
  const config = workspace.releases[0]?.snapshot ?? workspace
  const page = config.pages.find((item) => item.id === pageId)
  const object = config.objects.find((item) => item.id === page?.objectId)
  const [data, setData] = useState<Record<string, unknown>>({})
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  if (!page || !object) return <Navigate to="/runtime/forms" replace />
  const submit = (event: FormEvent) => { event.preventDefault(); const result = submitRuntimeRecord(page.id, data); setMessage({ ok: result.ok, text: result.ok ? '提交成功，流程已按发布配置启动。' : result.message ?? '提交失败' }); if (result.ok) window.setTimeout(() => navigate('/runtime/overview'), 900) }
  const fieldFor = (component: PageComponent) => object.fields.find((field) => field.code === component.binding)
  return <div className="page-shell max-w-5xl"><div className="mb-6"><div className="eyebrow">Dynamic Form</div><h2 className="page-title mt-2">{page.name}</h2><p className="page-subtitle">{page.description}</p></div><form onSubmit={submit} className="app-card overflow-hidden"><div className="grid grid-cols-12 gap-4 p-5 sm:p-7">{page.components.map((component) => { const width = component.width === 'full' ? 'col-span-12' : component.width === 'half' ? 'col-span-12 md:col-span-6' : 'col-span-12 md:col-span-4'; const field = fieldFor(component); if (component.type === 'heading') return <h3 key={component.id} className={`${width} text-xl font-semibold text-secondary-900`}>{component.label}</h3>; if (component.type === 'text' || component.type === 'container') return <p key={component.id} className={`${width} rounded-xl bg-secondary-50 p-3 text-sm text-secondary-600`}>{component.label}</p>; if (component.type === 'button') return <button key={component.id} className={`${width} btn-primary mt-2`} type="submit"><Send size={16} />{component.label}</button>; if (!component.binding) return null; if (component.type === 'select') return <label key={component.id} className={width}><span className="field-label">{component.label}{field?.required ? ' *' : ''}</span><select required={field?.required} className="field" value={String(data[component.binding] ?? '')} onChange={(event) => setData({ ...data, [component.binding as string]: event.target.value })}><option value="">请选择</option>{field?.options?.map((option) => <option key={option}>{option}</option>)}</select></label>; return <label key={component.id} className={width}><span className="field-label">{component.label}{field?.required ? ' *' : ''}</span><input required={field?.required} type={component.type === 'currency' ? 'number' : component.type === 'date' ? 'date' : 'text'} className="field" placeholder={component.placeholder} value={String(data[component.binding] ?? '')} onChange={(event) => setData({ ...data, [component.binding as string]: component.type === 'currency' ? Number(event.target.value) : event.target.value })} /></label> })}</div>{message && <div className={`mx-5 mb-5 rounded-xl border p-3 text-sm ${message.ok ? 'border-accent-200 bg-accent-50 text-accent-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{message.text}</div>}</form></div>
}

function GenericTaskCenter() {
  const { workspace, decideRuntimeTask } = useWorkspace()
  const { currentUser } = usePlatform()
  const config = workspace.releases[0]?.snapshot ?? workspace
  const tasks = useMemo(() => workspace.runtimeTasks.filter((task) => task.status === 'pending' && currentUser?.roles.includes(task.role)), [workspace.runtimeTasks, currentUser?.roles.join('|')])
  const [selectedId, setSelectedId] = useState('')
  const [comment, setComment] = useState('信息确认无误，同意。')
  const [message, setMessage] = useState('')
  const task = tasks.find((item) => item.id === selectedId) ?? tasks[0]
  const record = workspace.runtimeRecords.find((item) => item.id === task?.recordId)
  const object = config.objects.find((item) => item.id === record?.objectId)
  const decide = (decision: 'approve' | 'reject') => { if (!task) return; const result = decideRuntimeTask(task.id, decision, comment); setMessage(result.ok ? (decision === 'approve' ? '审批已通过' : '已按节点策略退回') : result.message ?? '处理失败'); setSelectedId('') }
  return <div className="page-shell max-w-[1500px]"><div className="mb-6"><div className="eyebrow">Human Tasks</div><h2 className="page-title mt-2">我的待办</h2><p className="page-subtitle">按当前账号身份展示本应用流程产生的任务。</p></div>{message && <div className="mb-4 rounded-xl border border-primary-200 bg-primary-50 p-3 text-sm text-primary-800">{message}</div>}{tasks.length ? <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]"><section className="app-card p-3">{tasks.map((item) => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`mb-2 w-full rounded-xl border p-4 text-left ${task?.id === item.id ? 'border-primary-300 bg-primary-50' : 'border-secondary-100'}`}><span className="badge-blue">{roleLabels[item.role]}</span><h3 className="mt-3 text-sm font-semibold">{item.nodeName}</h3><p className="mt-1 font-mono text-xs text-secondary-400">{workspace.runtimeRecords.find((recordItem) => recordItem.id === item.recordId)?.recordNo}</p></button>)}</section>{task && record && <section className="app-card overflow-hidden"><div className="panel-header"><div><h3 className="section-title">{task.nodeName}</h3><p className="mt-1 text-xs text-secondary-500">任务页面：{config.pages.find((page) => page.id === task.pageId)?.name ?? '默认详情'}</p></div><span className="badge-amber">待处理</span></div><div className="grid gap-3 p-5 sm:grid-cols-2">{object?.fields.map((field) => <div key={field.id} className="rounded-xl bg-secondary-50 p-3"><div className="text-[11px] text-secondary-400">{field.name}</div><div className="mt-1 text-sm font-medium text-secondary-800">{displayValue(record.data[field.code])}</div></div>)}</div><div className="border-t border-secondary-100 p-5"><label><span className="field-label">审批意见</span><textarea className="field min-h-24" value={comment} onChange={(event) => setComment(event.target.value)} /></label><div className="mt-4 flex justify-end gap-3"><button className="btn-danger" onClick={() => decide('reject')}><Undo2 size={16} />退回</button><button className="btn-primary" onClick={() => decide('approve')}><Check size={16} />同意</button></div></div></section>}</div> : <div className="empty-state app-card min-h-80"><Inbox size={30} className="text-secondary-300" /><h3 className="mt-4 font-semibold">暂无待办</h3><p className="mt-2 text-sm text-secondary-500">当前账号没有需要处理的本应用任务。</p></div>}</div>
}

function GenericTraceCenter() {
  const { workspace } = useWorkspace()
  return <div className="page-shell max-w-5xl"><div className="mb-6"><div className="eyebrow">Process Audit</div><h2 className="page-title mt-2">流程轨迹</h2><p className="page-subtitle">当前应用的表单提交、条件判断、审批和服务调用记录。</p></div><div className="app-card divide-y divide-secondary-100 overflow-hidden">{workspace.runtimeAudit.map((event) => <div key={event.id} className="flex gap-4 p-5"><span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-primary-500 ring-4 ring-primary-50" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-secondary-900">{event.action}</strong><span className="badge-gray">{event.actor}</span><time className="ml-auto text-[11px] text-secondary-400">{new Date(event.createdAt).toLocaleString()}</time></div><p className="mt-2 text-sm text-secondary-500">{event.detail}</p></div></div>)}{!workspace.runtimeAudit.length && <div className="empty-state min-h-72"><RouteIcon size={30} className="text-secondary-300" /><p className="mt-3 text-sm text-secondary-500">当前应用还没有流程轨迹</p></div>}</div></div>
}
