import { ClipboardList, FilePlus2, Gauge, ListChecks, Route as RouteIcon } from 'lucide-react'
import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { useWorkspace } from '../../state/WorkspaceContext'
import { usePlatform } from '../../state/PlatformContext'
import RequestList from './RequestList'
import NewRequest from './NewRequest'
import TaskCenter from './TaskCenter'
import TraceCenter from './TraceCenter'
import GenericRuntime from './GenericRuntime'

const links = [
  { to: '/runtime/overview', label: '运行概览', icon: Gauge },
  { to: '/runtime/requests', label: '采购申请', icon: ClipboardList },
  { to: '/runtime/new', label: '发起申请', icon: FilePlus2 },
  { to: '/runtime/tasks', label: '我的待办', icon: ListChecks },
  { to: '/runtime/traces', label: '流程轨迹', icon: RouteIcon },
]

export default function Runtime() {
  const { workspace } = useWorkspace()
  const { currentUser, activeApp } = usePlatform()
  const config = workspace.releases[0]?.snapshot ?? workspace
  const usesBuiltInProcurementRuntime = activeApp?.template === 'procurement'
    && config.objects.some((object) => object.code === 'purchase_request')
    && config.flows.some((flow) => flow.code === 'purchase_approval')
    && config.services.some((service) => service.code === 'purchase_request_crud')
  if (!usesBuiltInProcurementRuntime) return <GenericRuntime />
  const canApply = currentUser?.roles.includes('applicant') ?? false
  const pending = workspace.tasks.filter((task) => task.status === 'pending' && currentUser?.roles.includes(task.role)).length
  const visibleLinks = links.filter((link) => link.to !== '/runtime/new' || canApply)
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white">
      <div className="border-b border-secondary-200 bg-secondary-50">
        <div className="mx-auto max-w-[1500px] px-4 pt-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="eyebrow">Published Application</div><h1 className="mt-2 text-2xl font-semibold text-secondary-900">{workspace.appName}</h1><p className="mt-1 text-sm text-secondary-500">账号身份决定申请入口、审批权限与待办范围</p></div><div className="rounded-2xl border border-accent-200 bg-accent-50 px-4 py-3 text-xs text-accent-800"><strong>运行环境正常</strong><div className="mt-1 text-accent-600">数据写入本机 IndexedDB</div></div></div>
          <nav className="mt-6 flex gap-1 overflow-x-auto pb-px">
            {visibleLinks.map((link) => <NavLink key={link.to} to={link.to} className={({ isActive }) => `relative flex shrink-0 items-center gap-2 rounded-t-xl px-3 py-3 text-sm font-medium transition sm:px-4 ${isActive ? 'bg-white text-primary-700 shadow-[0_-1px_0_0_theme(colors.secondary.200),1px_0_0_0_theme(colors.secondary.200),-1px_0_0_0_theme(colors.secondary.200)]' : 'text-secondary-500 hover:bg-white/60 hover:text-secondary-900'}`}><link.icon size={16} />{link.label}{link.to.endsWith('/tasks') && pending > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] text-white">{pending}</span>}</NavLink>)}
          </nav>
        </div>
      </div>
      <Routes>
        <Route path="overview" element={<RuntimeOverview />} />
        <Route path="requests" element={<RequestList />} />
        <Route path="new" element={canApply ? <NewRequest /> : <Navigate to="overview" replace />} />
        <Route path="tasks" element={<TaskCenter />} />
        <Route path="traces" element={<TraceCenter />} />
        <Route path="*" element={<Navigate to="overview" replace />} />
      </Routes>
    </div>
  )
}

function RuntimeOverview() {
  const { workspace } = useWorkspace()
  const { currentUser } = usePlatform()
  const stats = [
    ['全部申请', workspace.requests.length, 'text-primary-700 bg-primary-50'],
    ['审批中', workspace.requests.filter((item) => item.status.startsWith('pending')).length, 'text-amber-700 bg-amber-50'],
    ['已完成', workspace.requests.filter((item) => item.status === 'approved').length, 'text-accent-700 bg-accent-50'],
    ['我的待办', workspace.tasks.filter((item) => item.status === 'pending' && currentUser?.roles.includes(item.role)).length, 'text-red-700 bg-red-50'],
  ]
  return <div className="page-shell max-w-[1500px]"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label, value, tone]) => <div key={String(label)} className="app-card p-5"><div className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ${tone}`}>{label}</div><div className="mt-4 text-3xl font-semibold text-secondary-900">{value}</div><div className="mt-2 text-xs text-secondary-400">实时统计 · 当前浏览器</div></div>)}</div><div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]"><RequestList embedded /><div className="app-card p-5"><h2 className="section-title">流程说明</h2><div className="mt-5 space-y-0">{['提交采购申请', '部门经理审批', '金额条件判断', '财务审批（> ¥10,000）', '写入采购台账'].map((label, index) => <div key={label} className="flex gap-3"><div className="flex flex-col items-center"><span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${index === 0 ? 'bg-primary-600 text-white' : 'bg-secondary-100 text-secondary-500'}`}>{index + 1}</span>{index < 4 && <span className="h-8 w-px bg-secondary-200" />}</div><div className="pt-1 text-sm text-secondary-700">{label}</div></div>)}</div></div></div></div>
}
