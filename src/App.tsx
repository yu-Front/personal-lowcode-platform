import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import AppManager from './pages/AppManager'
import AuthPage from './pages/Auth'
import FlowDesigner from './pages/FlowDesigner'
import ObjectStudio from './pages/ObjectStudio'
import Overview from './pages/Overview'
import PageDesigner from './pages/PageDesigner'
import PublishCenter from './pages/PublishCenter'
import Runtime from './pages/Runtime'
import ServiceStudio from './pages/ServiceStudio'
import UserManagement from './pages/UserManagement'
import { useWorkspace } from './state/WorkspaceContext'
import { usePlatform } from './state/PlatformContext'

export default function App() {
  const { ready: platformReady, currentUser, activeApp } = usePlatform()
  const { ready: workspaceReady } = useWorkspace()
  if (!platformReady) {
    return <div className="grid min-h-screen place-items-center bg-secondary-50"><div className="text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" /><p className="mt-4 text-sm text-secondary-500">正在加载本地工作空间…</p></div></div>
  }
  if (!currentUser) return <AuthPage />
  if (!activeApp) return <AppManager standalone />
  if (!workspaceReady) return <div className="grid min-h-screen place-items-center bg-secondary-50"><div className="text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" /><p className="mt-4 text-sm text-secondary-500">正在切换应用…</p></div></div>
  return (
    <AppShell>
      <Routes>
        <Route path="/studio/overview" element={<Overview />} />
        <Route path="/studio/objects" element={<ObjectStudio />} />
        <Route path="/studio/pages" element={<PageDesigner />} />
        <Route path="/studio/services" element={<ServiceStudio />} />
        <Route path="/studio/flows" element={<FlowDesigner />} />
        <Route path="/studio/releases" element={<PublishCenter />} />
        <Route path="/apps" element={<AppManager />} />
        <Route path="/admin/users" element={currentUser.roles.includes('administrator') ? <UserManagement /> : <Navigate to="/studio/overview" replace />} />
        <Route path="/runtime/*" element={<Runtime />} />
        <Route path="*" element={<Navigate to="/studio/overview" replace />} />
      </Routes>
    </AppShell>
  )
}
