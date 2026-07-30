import { CheckCircle2, Send, Sparkles } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspace } from '../../state/WorkspaceContext'
import { usePlatform } from '../../state/PlatformContext'

export default function NewRequest() {
  const { submitRequest } = useWorkspace()
  const { currentUser } = usePlatform()
  const navigate = useNavigate()
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({ title: '', category: '办公设备', amount: '', supplier: '', reason: '', applicant: currentUser?.name ?? '', department: '数字产品部' })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const requestId = submitRequest({ ...form, applicant: currentUser?.name ?? form.applicant, amount: Number(form.amount) })
    if (requestId) setSubmitted(true)
  }
  if (!currentUser?.roles.includes('applicant')) return <div className="page-shell max-w-3xl"><div className="empty-state app-card min-h-[360px]"><h2 className="text-xl font-semibold text-secondary-900">当前账号没有发起权限</h2><p className="mt-2 max-w-md text-sm leading-6 text-secondary-500">只有拥有“申请人”身份的账号可以发起采购申请。请联系管理员为该账号添加身份。</p></div></div>
  if (submitted) return <div className="page-shell max-w-3xl"><div className="app-card animate-slide-up p-8 text-center sm:p-12"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent-100 text-accent-700"><CheckCircle2 size={30} /></span><h2 className="mt-5 text-2xl font-semibold text-secondary-900">申请已提交</h2><p className="mt-2 text-sm leading-6 text-secondary-500">流程已启动，并为拥有“部门经理”身份的账号生成了一条待办。</p><div className="mt-7 flex flex-wrap justify-center gap-3"><button className="btn-secondary" onClick={() => { setSubmitted(false); setForm({ ...form, title: '', amount: '', supplier: '', reason: '' }) }}>再发起一条</button><button className="btn-primary" onClick={() => navigate('/runtime/tasks')}>前往待办中心</button></div></div></div>
  return <div className="page-shell max-w-5xl"><div className="mb-6"><div className="eyebrow">Dynamic Form</div><h2 className="page-title mt-2">发起采购申请</h2><p className="page-subtitle">这个运行态表单对应配置态中的页面 DSL 与采购申请对象。</p></div><form onSubmit={submit} className="app-card overflow-hidden"><div className="flex items-center gap-3 border-b border-secondary-100 bg-gradient-to-r from-primary-50 to-cyan-50 p-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-600 text-white"><Sparkles size={19} /></span><div><h3 className="font-semibold text-secondary-900">采购申请表</h3><p className="mt-1 text-xs text-secondary-500">采购审批流程 · v1</p></div><span className="badge-green ml-auto">自动保存</span></div><div className="grid gap-5 p-5 sm:p-7 md:grid-cols-2">
    <label><span className="field-label">申请标题 *</span><input required className="field" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="例如：设计团队工作站采购" /></label>
    <label><span className="field-label">采购类别 *</span><select className="field" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{['办公设备', '软件服务', '市场物料', '专业服务'].map((item) => <option key={item}>{item}</option>)}</select></label>
    <label><span className="field-label">申请金额（元）*</span><input required min="1" type="number" className="field" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="超过 10000 元将追加财务审批" /></label>
    <label><span className="field-label">意向供应商</span><input className="field" value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })} placeholder="供应商名称" /></label>
    <label className="md:col-span-2"><span className="field-label">采购事由 *</span><textarea required className="field min-h-32 resize-y" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="说明采购背景、使用场景与预期价值" /></label>
    <label><span className="field-label">申请人</span><input className="field bg-secondary-50" value={form.applicant} readOnly /></label><label><span className="field-label">所属部门</span><input className="field bg-secondary-50" value={form.department} readOnly /></label>
  </div><div className="flex flex-col gap-3 border-t border-secondary-100 bg-secondary-50 p-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-secondary-500">提交后会立即生成部门经理待办，并记录完整流程轨迹。</p><button type="submit" className="btn-primary"><Send size={16} />提交审批</button></div></form></div>
}
