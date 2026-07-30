import {
  Activity, AppWindow, Boxes, Cloud, Database, ExternalLink, GitBranch,
  Grid2X2, LayoutDashboard, LoaderCircle, LogOut, Menu, PackageCheck, Play, ServerCog, Sparkles, UsersRound, X,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import ConfirmDialog from './ConfirmDialog'
import { useWorkspace } from '../state/WorkspaceContext'
import { usePlatform } from '../state/PlatformContext'
import type { AccountRole } from '../types/platform'
import { withMinimumLoading } from '../utils/async'

type NavItem = { to: string; label: string; icon: typeof Activity; adminOnly?: boolean }
const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: '工作空间',
    items: [
      { to: '/apps', label: '应用中心', icon: Grid2X2 },
      { to: '/studio/overview', label: '应用概览', icon: LayoutDashboard },
      { to: '/studio/objects', label: '数据对象', icon: Database },
      { to: '/studio/pages', label: '页面设计', icon: AppWindow },
      { to: '/studio/services', label: '服务中心', icon: ServerCog },
      { to: '/studio/flows', label: '流程设计', icon: GitBranch },
      { to: '/studio/releases', label: '发布中心', icon: PackageCheck },
      { to: '/admin/users', label: '用户管理', icon: UsersRound, adminOnly: true },
    ],
  },
  {
    label: '体验应用',
    items: [{ to: '/runtime', label: '进入运行态', icon: Play }],
  },
]

const roleLabels: Record<AccountRole, string> = {
  administrator: '管理员',
  applicant: '申请人',
  department_manager: '部门经理',
  finance: '财务审批人',
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { saveState } = useWorkspace()
  const { activeApp, userApps, setActiveApp, currentUser, logout } = usePlatform()
  const [open, setOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const isRuntime = location.pathname.startsWith('/runtime')
  const confirmLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try { await withMinimumLoading(logout) } finally { setLoggingOut(false) }
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-secondary-200 bg-secondary-900 text-white transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 items-center justify-between border-b border-secondary-800 px-5">
          <NavLink to="/studio/overview" className="flex items-center gap-3" onClick={() => setOpen(false)}>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-500 shadow-float"><Boxes size={19} /></span>
            <span>
              <strong className="block text-sm">Forge Studio</strong>
              <small className="text-xs text-secondary-400">个人低代码平台</small>
            </span>
          </NavLink>
          <button className="rounded-lg p-2 text-secondary-400 hover:bg-secondary-800 lg:hidden" onClick={() => setOpen(false)} aria-label="关闭导航"><X size={20} /></button>
        </div>

        <div className="mx-4 mt-5 rounded-2xl border border-secondary-700 bg-secondary-800/70 p-3.5">
          <div className="flex items-center gap-2 text-xs text-secondary-400"><Sparkles size={14} className="text-primary-400" /> 当前应用</div>
          <select value={activeApp?.id ?? ''} onChange={(event) => setActiveApp(event.target.value).then(() => navigate('/studio/overview'))} className="mt-2 w-full rounded-lg border border-secondary-600 bg-secondary-800 px-2 py-1.5 text-sm font-medium text-white outline-none" aria-label="切换当前应用">{userApps.map((app) => <option key={app.id} value={app.id}>{app.name}</option>)}</select>
          <div className="mt-2 flex items-center gap-2 text-xs text-accent-300"><span className="h-2 w-2 animate-pulse-soft rounded-full bg-accent-400" />开发环境</div>
        </div>

        <nav className="mt-5 px-3">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-5">
              <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary-500">{group.label}</div>
              <div className="space-y-1">
                {group.items.filter((item) => !item.adminOnly || currentUser?.roles.includes('administrator')).map((item) => (
                  <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${isActive ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20' : 'text-secondary-300 hover:bg-secondary-800 hover:text-white'}`}>
                    <item.icon size={18} />
                    <span>{item.label}</span>
                    {item.to === '/runtime' && <ExternalLink size={13} className="ml-auto opacity-60" />}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <button onClick={() => setLogoutOpen(true)} className="absolute inset-x-4 bottom-[68px] flex items-center gap-2 rounded-xl px-3.5 py-2 text-left text-xs text-secondary-400 transition hover:bg-secondary-800 hover:text-white"><span className="grid h-7 w-7 place-items-center rounded-lg bg-secondary-700 text-white">{currentUser?.name.slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1"><strong className="block truncate text-secondary-200">{currentUser?.name}</strong><span className="block truncate text-[10px]">{currentUser?.email}</span></span><LogOut size={14} /></button>
        <div className="absolute inset-x-4 bottom-4 rounded-xl bg-secondary-800 px-3.5 py-3 text-xs text-secondary-400">
          <div className="flex items-center gap-2"><Cloud size={14} className={saveState === 'saved' ? 'text-accent-400' : 'text-amber-400'} />{saveState === 'saved' ? '已保存至本机 IndexedDB' : '正在保存更改…'}</div>
        </div>
      </aside>

      {open && <button className="fixed inset-0 z-30 bg-secondary-900/40 lg:hidden" onClick={() => setOpen(false)} aria-label="关闭遮罩" />}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-secondary-200 bg-white/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button className="rounded-xl border border-secondary-200 p-2.5 text-secondary-600 lg:hidden" onClick={() => setOpen(true)} aria-label="打开导航"><Menu size={20} /></button>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-secondary-900">{isRuntime ? `${activeApp?.name ?? '应用'} · 运行态` : '应用配置工作台'}</div>
              <div className="hidden items-center gap-1.5 text-xs text-secondary-400 sm:flex"><Activity size={12} /> Configuration → Release → Runtime</div>
            </div>
          </div>
          <div className="flex max-w-[55%] items-center justify-end gap-1.5 overflow-hidden">
            {currentUser?.roles.map((role) => <span key={role} className={role === 'administrator' ? 'badge-blue whitespace-nowrap' : 'badge-gray whitespace-nowrap'}>{roleLabels[role]}</span>)}
          </div>
        </header>
        <main>{children}</main>
      </div>
      {saveState === 'saving' && <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border border-primary-100 bg-white px-4 py-3 text-sm font-medium text-secondary-700 shadow-float"><LoaderCircle size={17} className="animate-spin text-primary-600" />正在保存本地数据…</div>}
      <ConfirmDialog open={logoutOpen} title="退出登录" description={`确定退出账号「${currentUser?.name ?? ''}」吗？`} confirmText="确认退出" variant="warning" warningText="退出后将返回登录页面，本机中的应用和配置数据不会被删除。" busy={loggingOut} onCancel={() => setLogoutOpen(false)} onConfirm={confirmLogout} />
    </div>
  )
}
