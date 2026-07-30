import { AlertTriangle, CheckCircle2, Download, FileJson, LoaderCircle, PackageCheck, RefreshCcw, Rocket, ShieldCheck, Trash2, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHeader from '../../components/PageHeader'
import { validateRelease } from '../../domain/workflowEngine.js'
import { useWorkspace } from '../../state/WorkspaceContext'
import type { WorkspaceState } from '../../types/workspace'
import { withMinimumLoading } from '../../utils/async'

export default function PublishCenter() {
  const { workspace, publish, restoreSample, clearSandbox, importWorkspace } = useWorkspace()
  const [note, setNote] = useState(`完成${workspace.appName}页面与流程配置`)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [pendingAction, setPendingAction] = useState<'publish' | 'import' | 'restore' | 'clear' | null>(null)
  const [confirmAction, setConfirmAction] = useState<'import' | 'restore' | 'clear' | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const errors = useMemo(() => validateRelease(workspace), [workspace])
  useEffect(() => {
    setNote(`完成${workspace.appName}页面与流程配置`)
    setMessage(null)
  }, [workspace.ownerAppId])
  const checks = [
    ['数据对象', workspace.objects.length, workspace.objects.length > 0], ['页面 DSL', workspace.pages.length, workspace.pages.length > 0],
    ['服务定义（可选）', workspace.services.length, true], ['流程定义', workspace.flows.length, workspace.flows.length > 0],
  ]
  const doPublish = async () => {
    if (pendingAction) return
    setPendingAction('publish')
    const result = await withMinimumLoading(() => publish(note))
    setMessage(result.length ? { type: 'error', text: result.join('；') } : { type: 'success', text: '发布成功，新的不可变版本快照已生成。' })
    setPendingAction(null)
  }
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `forge-studio-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url)
  }
  const importJson = async (file?: File) => {
    if (!file) return
    setPendingAction('import')
    try { await withMinimumLoading(async () => importWorkspace(JSON.parse(await file.text()) as WorkspaceState)); setMessage({ type: 'success', text: '工作空间已成功导入。' }) } catch { setMessage({ type: 'error', text: '导入失败，请检查 JSON 文件格式。' }) } finally { setPendingAction(null) }
  }
  const restore = async () => { if (pendingAction) return; setPendingAction('restore'); try { await withMinimumLoading(restoreSample); setMessage({ type: 'success', text: '示例应用已恢复。' }) } finally { setPendingAction(null) } }
  const clear = async () => { if (pendingAction) return; setPendingAction('clear'); try { await withMinimumLoading(clearSandbox); setMessage({ type: 'success', text: '运行数据已清空，配置结构保留。' }) } finally { setPendingAction(null) } }
  const runConfirmedAction = async () => {
    if (confirmAction === 'import') await importJson(importFile ?? undefined)
    if (confirmAction === 'restore') await restore()
    if (confirmAction === 'clear') await clear()
    setConfirmAction(null)
    setImportFile(null)
  }
  const confirmTitle = confirmAction === 'import' ? '导入工作空间' : confirmAction === 'restore' ? '恢复完整示例' : '清空运行沙盒'
  const confirmDescription = confirmAction === 'import' ? `导入「${importFile?.name ?? ''}」将覆盖当前应用的配置和运行数据。` : confirmAction === 'restore' ? '恢复示例会使用完整演示配置覆盖当前工作空间。' : '将清除当前应用的全部运行记录、待办和流程轨迹，配置结构会保留。'

  return (
    <div className="page-shell">
      <ConfirmDialog open={confirmAction !== null} title={confirmTitle} description={confirmDescription} confirmText={confirmAction === 'import' ? '确认导入' : confirmAction === 'restore' ? '确认恢复' : '确认清空'} variant={confirmAction === 'clear' ? 'danger' : 'warning'} busy={pendingAction !== null} onCancel={() => { setConfirmAction(null); setImportFile(null) }} onConfirm={runConfirmedAction} />
      <PageHeader eyebrow="Release Management" title="发布中心" description="发布前校验对象、页面、服务和流程的依赖关系，并生成不可变版本快照供运行态使用。" actions={<button className="btn-primary" onClick={doPublish} disabled={errors.length > 0 || pendingAction !== null} aria-busy={pendingAction === 'publish'}>{pendingAction === 'publish' ? <LoaderCircle size={17} className="animate-spin" /> : <Rocket size={17} />}{pendingAction === 'publish' ? '正在发布…' : '发布新版本'}</button>} />
      {message && <div className={`mb-5 flex items-center gap-3 rounded-2xl border p-4 text-sm ${message.type === 'success' ? 'border-accent-200 bg-accent-50 text-accent-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}{message.text}</div>}
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="app-card overflow-hidden">
          <div className="panel-header"><div><h2 className="section-title">发布检查</h2><p className="mt-1 text-xs text-secondary-500">当前配置的依赖与完整性</p></div><span className={errors.length ? 'badge-red' : 'badge-green'}>{errors.length ? `${errors.length} 个问题` : '全部通过'}</span></div>
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            {checks.map(([label, count, passed]) => <div key={String(label)} className="flex items-center gap-3 rounded-2xl border border-secondary-100 bg-secondary-50 p-4"><span className={`grid h-10 w-10 place-items-center rounded-xl ${passed ? 'bg-accent-100 text-accent-700' : 'bg-red-100 text-red-700'}`}>{passed ? <CheckCircle2 size={19} /> : <AlertTriangle size={19} />}</span><div><div className="text-sm font-medium text-secondary-900">{label}</div><div className="mt-0.5 text-xs text-secondary-500">{count} 项配置</div></div><span className={`ml-auto h-2.5 w-2.5 rounded-full ${passed ? 'bg-accent-500' : 'bg-red-500'}`} /></div>)}
          </div>
          <div className="border-t border-secondary-100 p-5">
            <label><span className="field-label">版本说明</span><textarea className="field min-h-24" value={note} onChange={(event) => setNote(event.target.value)} placeholder="描述本次发布包含的变更" /></label>
            <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-secondary-900 p-4 text-sm text-white sm:flex-row sm:items-center"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-500"><ShieldCheck size={19} /></span><div className="flex-1"><strong>发布后配置仍可继续编辑</strong><p className="mt-1 text-xs text-secondary-400">运行态读取最新快照；历史版本保持不可变，可用于作品演示与比对。</p></div><button className="btn-primary" onClick={doPublish} disabled={errors.length > 0 || pendingAction !== null} aria-busy={pendingAction === 'publish'}>{pendingAction === 'publish' ? <LoaderCircle size={16} className="animate-spin" /> : <Rocket size={16} />}{pendingAction === 'publish' ? '正在发布…' : '确认发布'}</button></div>
          </div>
        </section>

        <section className="app-card overflow-hidden">
          <div className="panel-header"><div><h2 className="section-title">版本记录</h2><p className="mt-1 text-xs text-secondary-500">{workspace.releases.length} 个已发布版本</p></div><PackageCheck size={19} className="text-primary-600" /></div>
          <div className="max-h-[520px] space-y-3 overflow-auto p-4">
            {workspace.releases.map((release, index) => <div key={release.id} className="rounded-2xl border border-secondary-200 p-4"><div className="flex items-center gap-2"><span className="badge-blue">{release.version}</span>{index === 0 && <span className="badge-green">当前版本</span>}<span className="ml-auto text-[11px] text-secondary-400">{new Date(release.createdAt).toLocaleString()}</span></div><p className="mt-3 text-sm text-secondary-700">{release.note}</p><div className="mt-3 flex gap-3 text-[11px] text-secondary-400"><span>{release.snapshot.objects.length} 对象</span><span>{release.snapshot.pages.length} 页面</span><span>{release.snapshot.flows.length} 流程</span></div></div>)}
            {!workspace.releases.length && <div className="empty-state"><PackageCheck size={30} className="text-secondary-300" /><h3 className="mt-3 text-sm font-medium">尚未发布版本</h3><p className="mt-1 text-xs text-secondary-500">通过校验后发布第一个快照</p></div>}
          </div>
        </section>
      </div>

      <section className="app-card mt-6 overflow-hidden">
        <div className="panel-header"><div><h2 className="section-title">本地数据工具</h2><p className="mt-1 text-xs text-secondary-500">导出、导入或重置 IndexedDB 沙盒</p></div><FileJson size={19} className="text-primary-600" /></div>
        <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
          <button className="btn-secondary justify-start" onClick={exportJson}><Download size={17} />导出工作空间 JSON</button>
          <button className="btn-secondary justify-start" disabled={pendingAction !== null} onClick={() => fileRef.current?.click()}>{pendingAction === 'import' ? <LoaderCircle size={17} className="animate-spin" /> : <Upload size={17} />}{pendingAction === 'import' ? '正在导入…' : '导入工作空间 JSON'}</button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) { setImportFile(file); setConfirmAction('import') } event.target.value = '' }} />
          <button className="btn-secondary justify-start" disabled={pendingAction !== null} onClick={() => setConfirmAction('restore')}>{pendingAction === 'restore' ? <LoaderCircle size={17} className="animate-spin" /> : <RefreshCcw size={17} />}{pendingAction === 'restore' ? '正在恢复…' : '恢复完整示例'}</button>
          <button className="btn-danger justify-start" disabled={pendingAction !== null} onClick={() => setConfirmAction('clear')}>{pendingAction === 'clear' ? <LoaderCircle size={17} className="animate-spin" /> : <Trash2 size={17} />}{pendingAction === 'clear' ? '正在清空…' : '清空运行沙盒'}</button>
        </div>
      </section>
    </div>
  )
}
