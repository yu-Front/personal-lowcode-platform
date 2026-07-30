import { AlertTriangle, Check, LoaderCircle, ShieldCheck, Trash2, UserCog, UsersRound } from 'lucide-react'
import { useState } from 'react'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHeader from '../../components/PageHeader'
import { usePlatform } from '../../state/PlatformContext'
import type { AccountRole, UserAccount } from '../../types/platform'
import { withMinimumLoading } from '../../utils/async'

const roles: { value: AccountRole; label: string; description: string }[] = [
  { value: 'administrator', label: '管理员', description: '管理账号和身份' },
  { value: 'applicant', label: '申请人', description: '发起业务申请' },
  { value: 'department_manager', label: '部门经理', description: '处理部门审批' },
  { value: 'finance', label: '财务审批人', description: '处理财务审批' },
]

export default function UserManagement() {
  const { platform, currentUser, updateUserRoles, deleteUser } = usePlatform()
  const [message, setMessage] = useState('')
  const [pendingLabel, setPendingLabel] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<UserAccount | null>(null)

  const toggleRole = async (user: UserAccount, role: AccountRole) => {
    if (pendingLabel) return
    setPendingLabel(`正在更新 ${user.name} 的身份…`)
    const next = user.roles.includes(role) ? user.roles.filter((item) => item !== role) : [...user.roles, role]
    try { const result = await withMinimumLoading(() => updateUserRoles(user.id, next)); setMessage(result.ok ? `已更新 ${user.name} 的身份` : result.message ?? '操作失败') } finally { setPendingLabel('') }
  }

  const removeUser = (user: UserAccount) => setDeleteTarget(user)
  const confirmRemoveUser = async () => {
    const user = deleteTarget
    if (!user) return
    setPendingLabel(`正在删除账号 ${user.name}…`)
    try { const result = await withMinimumLoading(() => deleteUser(user.id)); setMessage(result.ok ? `账号 ${user.name} 已删除` : result.message ?? '删除失败'); if (result.ok) setDeleteTarget(null) } finally { setPendingLabel('') }
  }

  return <div className="page-shell max-w-[1500px]">
    <ConfirmDialog open={deleteTarget !== null} title="删除账号" description={`确定删除账号「${deleteTarget?.name ?? ''}」吗？该账号创建的应用、配置和运行数据也会一并删除。`} busy={pendingLabel.startsWith('正在删除')} onCancel={() => setDeleteTarget(null)} onConfirm={confirmRemoveUser} />
    {pendingLabel && <div role="status" aria-live="polite" className="fixed inset-0 z-50 grid place-items-center bg-secondary-900/20 backdrop-blur-[2px]"><div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-medium text-secondary-800 shadow-float"><LoaderCircle size={19} className="animate-spin text-primary-600" />{pendingLabel}</div></div>}
    <PageHeader eyebrow="Role Based Access Control" title="用户与身份管理" description="管理员可以为账号授予或移除身份，并删除其他账号。身份权限会直接决定运行态可见菜单和待办范围。" />
    {message && <div className="mb-5 flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-800"><Check size={16} />{message}</div>}
    <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{roles.map((role) => <div key={role.value} className="app-card p-4"><div className="flex items-center gap-3"><span className={`grid h-9 w-9 place-items-center rounded-xl ${role.value === 'administrator' ? 'bg-primary-50 text-primary-700' : 'bg-secondary-100 text-secondary-600'}`}>{role.value === 'administrator' ? <ShieldCheck size={18} /> : <UserCog size={18} />}</span><div><div className="text-sm font-semibold text-secondary-900">{role.label}</div><div className="mt-0.5 text-[11px] text-secondary-400">{role.description}</div></div></div></div>)}</div>
    <section className="app-card overflow-hidden">
      <div className="panel-header"><div><h2 className="section-title">本地账号</h2><p className="mt-1 text-xs text-secondary-500">共 {platform.users.length} 个账号 · 数据仅存在当前浏览器</p></div><span className="badge-blue"><UsersRound size={13} />管理员视图</span></div>
      <div className="overflow-x-auto"><table className="data-table min-w-[940px]"><thead><tr><th>账号</th><th>注册时间</th><th>身份权限</th><th>状态</th><th>操作</th></tr></thead><tbody>{platform.users.map((user) => {
        const self = user.id === currentUser?.id
        return <tr key={user.id}><td><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary-100 text-xs font-semibold text-secondary-700">{user.name.slice(0, 1).toUpperCase()}</span><div><div className="font-medium text-secondary-900">{user.name}{self && <span className="ml-2 text-[11px] font-normal text-primary-600">当前账号</span>}</div><div className="mt-0.5 text-xs text-secondary-400">{user.email}</div></div></div></td><td>{new Date(user.createdAt).toLocaleDateString()}</td><td><div className="flex flex-wrap gap-2">{roles.map((role) => { const active = user.roles.includes(role.value); return <button key={role.value} type="button" aria-pressed={active} disabled={self} onClick={() => toggleRole(user, role.value)} className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-70 ${active ? 'border-primary-200 bg-primary-50 text-primary-700' : 'border-secondary-200 bg-white text-secondary-400 hover:border-primary-200'}`}>{active && <Check size={12} className="mr-1 inline" />}{role.label}</button> })}</div></td><td><span className="badge-green"><span className="h-1.5 w-1.5 rounded-full bg-accent-500" />正常</span></td><td><button className="rounded-lg p-2 text-secondary-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30" disabled={self} onClick={() => removeUser(user)} aria-label={`删除账号 ${user.name}`}><Trash2 size={17} /></button></td></tr>
      })}</tbody></table></div>
      <div className="flex items-start gap-3 border-t border-amber-100 bg-amber-50 p-4 text-xs leading-5 text-amber-800"><AlertTriangle size={16} className="mt-0.5 shrink-0" /><p>为避免当前会话失去管理权限，管理员不能修改或删除自己。可以先为另一个账号授予管理员身份，再由该账号调整原管理员。</p></div>
    </section>
  </div>
}
