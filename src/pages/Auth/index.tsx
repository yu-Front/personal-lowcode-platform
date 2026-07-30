import { ArrowRight, Boxes, CheckCircle2, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, Sparkles, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlatform } from '../../state/PlatformContext'
import type { UserRole } from '../../types/workspace'
import { withMinimumLoading } from '../../utils/async'

export default function AuthPage() {
  const { login, register } = usePlatform()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<{ name: string; email: string; password: string; role: UserRole }>({ name: '', email: '', password: '', role: 'applicant' })

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    const result = await withMinimumLoading(() => mode === 'login' ? login(form.email, form.password) : register(form.name, form.email, form.password, form.role))
    if (!result.ok) setError(result.message ?? '操作失败，请重试')
    else navigate('/studio/overview')
    setBusy(false)
  }

  const useDemo = () => setForm({ name: 'Cyril', email: 'demo@forge.local', password: 'demo123', role: 'applicant' })

  return <div className="min-h-screen bg-secondary-50 p-3 sm:p-6"><div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-7xl overflow-hidden rounded-3xl border border-secondary-200 bg-white shadow-float sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[1.05fr_0.95fr]">
    <section className="relative hidden overflow-hidden bg-secondary-900 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14"><div className="absolute -right-28 -top-28 h-80 w-80 rounded-full bg-primary-500/30 blur-3xl" /><div className="absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" /><div className="relative"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-500 shadow-float"><Boxes size={22} /></span><div><strong className="block">Forge Studio</strong><span className="text-xs text-secondary-400">Personal Low-code Platform</span></div></div><div className="mt-20 max-w-xl"><span className="badge bg-white/10 text-primary-200 ring-1 ring-inset ring-white/10"><Sparkles size={13} />从配置到运行，一个平台完成</span><h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">把业务逻辑<br />变成可以运行的应用</h1><p className="mt-5 max-w-lg text-base leading-7 text-secondary-300">创建数据模型、设计页面、编排流程并发布运行。所有内容都安全地保存在当前浏览器。</p></div></div><div className="relative grid grid-cols-3 gap-3">{[['01', '定义模型'], ['02', '编排体验'], ['03', '发布运行']].map(([number, label]) => <div key={number} className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="text-xs text-primary-300">{number}</div><div className="mt-2 text-sm">{label}</div></div>)}</div></section>
    <section className="flex items-center justify-center p-6 sm:p-10 xl:p-16"><div className="w-full max-w-md"><div className="mb-10 flex items-center gap-3 lg:hidden"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-600 text-white"><Boxes size={20} /></span><div><strong className="block text-sm">Forge Studio</strong><span className="text-xs text-secondary-400">个人低代码平台</span></div></div><div className="eyebrow">Welcome to Forge</div><h2 className="mt-3 text-3xl font-semibold tracking-tight text-secondary-900">{mode === 'login' ? '登录工作空间' : '创建你的账号'}</h2><p className="mt-2 text-sm leading-6 text-secondary-500">{mode === 'login' ? '继续搭建和运行你的低代码应用。' : '注册后会自动创建一个采购协同示例应用。'}</p>
      <div className="mt-7 grid grid-cols-2 rounded-xl bg-secondary-100 p-1"><button type="button" onClick={() => { setMode('login'); setError('') }} className={`rounded-lg py-2.5 text-sm font-medium transition ${mode === 'login' ? 'bg-white text-secondary-900 shadow-sm' : 'text-secondary-500'}`}>登录</button><button type="button" onClick={() => { setMode('register'); setError('') }} className={`rounded-lg py-2.5 text-sm font-medium transition ${mode === 'register' ? 'bg-white text-secondary-900 shadow-sm' : 'text-secondary-500'}`}>注册</button></div>
      <form onSubmit={submit} className="mt-6 space-y-5">{mode === 'register' && <><label className="block"><span className="field-label">姓名</span><span className="relative block"><UserRound size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary-400" /><input required className="field pl-10" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="你的名字" /></span></label><label className="block"><span className="field-label">注册身份</span><select className="field" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}><option value="applicant">申请人</option><option value="department_manager">部门经理</option><option value="finance">财务审批人</option></select><span className="mt-1.5 block text-[11px] text-secondary-400">管理员身份只能由现有管理员授予。</span></label></>}<label className="block"><span className="field-label">邮箱</span><span className="relative block"><Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary-400" /><input required type="email" className="field pl-10" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@example.com" /></span></label><label className="block"><span className="field-label">密码</span><span className="relative block"><LockKeyhole size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary-400" /><input required minLength={6} type={showPassword ? 'text' : 'password'} className="field px-10" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="至少 6 位" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-secondary-400" aria-label={showPassword ? '隐藏密码' : '显示密码'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">{error}</div>}
        <button className="btn-primary w-full py-3" disabled={busy} aria-busy={busy}>{busy ? <><LoaderCircle size={17} className="animate-spin" />{mode === 'login' ? '正在登录…' : '正在注册…'}</> : <>{mode === 'login' ? '登录平台' : '注册并开始'}<ArrowRight size={17} /></>}</button>
      </form>
      {mode === 'login' && <button type="button" onClick={useDemo} className="mt-4 flex w-full items-center gap-3 rounded-xl border border-primary-100 bg-primary-50 p-3.5 text-left transition hover:border-primary-200"><CheckCircle2 size={18} className="text-primary-600" /><span className="flex-1"><strong className="block text-xs text-primary-900">使用演示账号</strong><span className="mt-0.5 block text-[11px] text-primary-600">demo@forge.local / demo123</span></span><span className="text-xs font-medium text-primary-700">自动填充</span></button>}
      <p className="mt-8 text-center text-[11px] leading-5 text-secondary-400">本作品使用 IndexedDB 保存账号与应用数据。密码经 PBKDF2 加密，仅用于本地产品演示。</p>
    </div></section>
  </div></div>
}
