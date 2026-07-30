import { ArrowRight, Database, GitBranch, Layers3, PackageCheck, PlayCircle, ServerCog, Sparkles, TimerReset, Workflow } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { useWorkspace } from '../../state/WorkspaceContext'

const quickActions = [
  { to: '/studio/objects', label: '定义业务数据', description: '创建对象与字段模型', icon: Database, tone: 'bg-primary-50 text-primary-700' },
  { to: '/studio/pages', label: '搭建申请页面', description: '组合组件并绑定字段', icon: Layers3, tone: 'bg-cyan-50 text-cyan-700' },
  { to: '/studio/flows', label: '编排审批流程', description: '配置节点与条件分支', icon: GitBranch, tone: 'bg-amber-50 text-amber-700' },
  { to: '/runtime', label: '体验运行态', description: '发起申请并完成审批', icon: PlayCircle, tone: 'bg-accent-50 text-accent-700' },
]

export default function Overview() {
  const { workspace } = useWorkspace()
  const pending = workspace.tasks.filter((task) => task.status === 'pending').length
  const latest = workspace.requests.slice(0, 4)
  return (
    <div className="page-shell">
      <PageHeader eyebrow="Application Workspace" title="把业务想法，配置成可运行的应用" description="这是一个完整的本地低代码沙盒。数据模型、页面 DSL、服务、流程和运行数据都会实时保存到浏览器 IndexedDB。" actions={<Link to="/runtime" className="btn-primary"><PlayCircle size={17} />打开运行态</Link>} />

      <section className="relative overflow-hidden rounded-3xl bg-secondary-900 p-6 text-white shadow-float sm:p-8">
        <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full bg-primary-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/3 h-32 w-32 rounded-full bg-accent-400/10 blur-2xl" />
        <div className="relative grid gap-7 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <span className="badge bg-white/10 text-primary-200 ring-1 ring-inset ring-white/10"><Sparkles size={13} />示例应用已就绪</span>
            <h2 className="mt-5 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">{workspace.appName}</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-secondary-300 sm:text-base">{workspace.appDescription}</p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs text-secondary-300">
              <span className="rounded-lg bg-white/5 px-3 py-2">配置态</span><ArrowRight size={15} className="self-center" />
              <span className="rounded-lg bg-white/5 px-3 py-2">版本发布</span><ArrowRight size={15} className="self-center" />
              <span className="rounded-lg bg-primary-500/20 px-3 py-2 text-primary-200">运行态</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[['数据对象', workspace.objects.length], ['页面', workspace.pages.length], ['服务', workspace.services.length], ['流程', workspace.flows.length]].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"><div className="text-2xl font-semibold">{value}</div><div className="mt-1 text-xs text-secondary-400">{label}</div></div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((item) => (
          <Link key={item.to} to={item.to} className="app-card group p-5 transition hover:-translate-y-1 hover:border-primary-200 hover:shadow-float">
            <div className={`grid h-10 w-10 place-items-center rounded-xl ${item.tone}`}><item.icon size={19} /></div>
            <h3 className="mt-4 text-sm font-semibold text-secondary-900">{item.label}</h3>
            <p className="mt-1 text-xs leading-5 text-secondary-500">{item.description}</p>
            <ArrowRight size={16} className="mt-4 text-secondary-300 transition group-hover:translate-x-1 group-hover:text-primary-600" />
          </Link>
        ))}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="app-card overflow-hidden">
          <div className="panel-header"><div><h2 className="section-title">最近申请</h2><p className="mt-1 text-xs text-secondary-500">运行态产生的真实演示数据</p></div><Link className="btn-ghost" to="/runtime">查看全部 <ArrowRight size={15} /></Link></div>
          <div className="overflow-x-auto">
            <table className="data-table"><thead><tr><th>申请单</th><th>金额</th><th>状态</th><th>申请人</th></tr></thead><tbody>
              {latest.map((request) => <tr key={request.id}><td><div className="font-medium text-secondary-900">{request.title}</div><div className="mt-0.5 text-xs text-secondary-400">{request.requestNo}</div></td><td>¥ {request.amount.toLocaleString()}</td><td><StatusBadge status={request.status} /></td><td>{request.applicant}</td></tr>)}
            </tbody></table>
          </div>
        </section>
        <section className="app-card p-5">
          <div className="flex items-center justify-between"><div><h2 className="section-title">运行健康度</h2><p className="mt-1 text-xs text-secondary-500">本地沙盒实时状态</p></div><span className="badge-green">正常</span></div>
          <div className="mt-6 space-y-4">
            {[
              { icon: ServerCog, label: '服务可用', value: `${workspace.services.length}/${workspace.services.length}`, bar: 'w-full bg-accent-500' },
              { icon: Workflow, label: '流程完整', value: `${workspace.flows.length}/${workspace.flows.length}`, bar: 'w-full bg-primary-500' },
              { icon: TimerReset, label: '待处理任务', value: String(pending), bar: pending ? 'w-2/3 bg-amber-400' : 'w-1/5 bg-secondary-300' },
              { icon: PackageCheck, label: '发布版本', value: String(workspace.releases.length), bar: workspace.releases.length ? 'w-4/5 bg-cyan-500' : 'w-1/5 bg-secondary-300' },
            ].map((item) => <div key={item.label}><div className="mb-2 flex items-center text-xs"><item.icon size={14} className="mr-2 text-secondary-400" /><span className="text-secondary-600">{item.label}</span><strong className="ml-auto text-secondary-900">{item.value}</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-secondary-100"><div className={`h-full rounded-full ${item.bar}`} /></div></div>)}
          </div>
        </section>
      </div>
    </div>
  )
}
