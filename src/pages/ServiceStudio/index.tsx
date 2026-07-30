import { CheckCircle2, Clock3, Code2, Copy, LoaderCircle, Play, Save, ServerCog, TerminalSquare, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import ConfirmDialog from '../../components/ConfirmDialog'
import NoticeDialog from '../../components/NoticeDialog'
import PageHeader from '../../components/PageHeader'
import { findResourceReferences, referenceMessage } from '../../domain/dependencyGraph'
import { useWorkspace } from '../../state/WorkspaceContext'
import type { ServiceDefinition } from '../../types/workspace'
import { delay, MIN_LOADING_MS } from '../../utils/async'

const methodStyle = { GET: 'bg-accent-50 text-accent-700', POST: 'bg-primary-50 text-primary-700', PUT: 'bg-amber-50 text-amber-700', DELETE: 'bg-red-50 text-red-700' }

export default function ServiceStudio() {
  const { workspace, saveState, updateService, addService, deleteService } = useWorkspace()
  const [selectedId, setSelectedId] = useState(workspace.services[0]?.id ?? '')
  const source = useMemo(() => workspace.services.find((item) => item.id === selectedId), [workspace.services, selectedId])
  const [draft, setDraft] = useState<ServiceDefinition | null>(source ? structuredClone(source) : null)
  const [responseText, setResponseText] = useState(source ? JSON.stringify(source.mockResponse, null, 2) : '{}')
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{ time: number; body: Record<string, unknown> } | null>(null)
  const [notice, setNotice] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  useEffect(() => { if (source) { setDraft(structuredClone(source)); setResponseText(JSON.stringify(source.mockResponse, null, 2)); setResult(null); setNotice('') } }, [source])

  const save = () => {
    if (!draft) return
    try { updateService({ ...draft, mockResponse: JSON.parse(responseText) as Record<string, unknown> }) } catch { return }
  }
  const test = () => {
    if (!draft) return
    setTesting(true); setResult(null)
    window.setTimeout(() => { try { setResult({ time: 128, body: JSON.parse(responseText) as Record<string, unknown> }) } catch { setResult({ time: 4, body: { success: false, message: 'Mock JSON 格式错误' } }) } setTesting(false) }, MIN_LOADING_MS)
  }
  const removeService = () => {
    if (!draft) return
    const references = findResourceReferences(workspace, 'service', draft.id)
    if (references.length) { setNotice(referenceMessage(`服务「${draft.name}」`, references)); return }
    setConfirmOpen(true)
  }
  const confirmRemoveService = async () => {
    if (!draft || deleting) return
    setDeleting(true)
    await delay()
    const nextId = workspace.services.find((service) => service.id !== draft.id)?.id ?? ''
    const result = deleteService(draft.id)
    if (!result.ok) { setNotice(referenceMessage(`服务「${draft.name}」`, result.references)); setDeleting(false); setConfirmOpen(false); return }
    setNotice('')
    setSelectedId(nextId)
    if (!nextId) setDraft(null)
    setDeleting(false)
    setConfirmOpen(false)
  }

  return (
    <div className="page-shell">
      <ConfirmDialog open={confirmOpen} title="删除服务" description={`确定删除「${draft?.name ?? ''}」吗？依赖该服务的自动化能力将无法继续使用。`} busy={deleting} onCancel={() => setConfirmOpen(false)} onConfirm={confirmRemoveService} />
      <PageHeader eyebrow="Service Orchestration" title="服务中心" description="统一管理对象 CRUD 与 Mock 服务。这里的测试台完全在浏览器运行，适合无后端演示。" actions={<button className="btn-primary" onClick={() => { const id = addService(); setSelectedId(id); setNotice('') }}><Play size={16} />新建服务</button>} />
      <NoticeDialog open={Boolean(notice)} title="服务正在被使用" description={notice} onClose={() => setNotice('')} />
      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <section className="app-card overflow-hidden">
          <div className="panel-header"><div><h2 className="section-title">服务目录</h2><p className="mt-1 text-xs text-secondary-500">{workspace.services.length} 个可用服务</p></div><ServerCog size={19} className="text-primary-600" /></div>
          <div className="space-y-2 p-3">
            {workspace.services.map((service) => <button key={service.id} onClick={() => setSelectedId(service.id)} className={`w-full rounded-xl border p-4 text-left transition ${selectedId === service.id ? 'border-primary-200 bg-primary-50' : 'border-secondary-100 hover:bg-secondary-50'}`}>
              <div className="flex items-center justify-between gap-2"><strong className="truncate text-sm text-secondary-900">{service.name}</strong><span className={`rounded-md px-2 py-1 font-mono text-[10px] font-bold ${methodStyle[service.method]}`}>{service.method}</span></div>
              <div className="mt-2 truncate font-mono text-[11px] text-secondary-400">{service.path}</div>
              <div className="mt-3 flex items-center gap-2"><span className={service.type === 'object' ? 'badge-blue' : 'badge-amber'}>{service.type === 'object' ? '对象服务' : 'Mock 服务'}</span><span className="badge-green"><span className="h-1.5 w-1.5 rounded-full bg-accent-500" />可用</span></div>
            </button>)}
          </div>
          {!workspace.services.length && <div className="empty-state m-3 min-h-48"><ServerCog size={28} className="text-secondary-300" /><p className="mt-3 text-sm text-secondary-500">还没有服务定义</p></div>}
        </section>

        {draft && <section className="space-y-5">
          <div className="app-card overflow-hidden">
            <div className="panel-header"><div><h2 className="section-title">服务定义</h2><p className="mt-1 font-mono text-xs text-secondary-400">{draft.code}</p></div><div className="flex gap-2"><button className="btn-danger" disabled={saveState === 'saving'} onClick={removeService}><Trash2 size={16} />删除服务</button><button className="btn-primary" disabled={saveState === 'saving'} onClick={save} aria-busy={saveState === 'saving'}>{saveState === 'saving' ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}{saveState === 'saving' ? '正在保存…' : '保存配置'}</button></div></div>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <label><span className="field-label">服务名称</span><input className="field" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
              <label><span className="field-label">服务类型</span><select className="field" value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as ServiceDefinition['type'] })}><option value="object">对象 CRUD 服务</option><option value="mock">Mock 服务</option></select></label>
              <label><span className="field-label">请求方法</span><select className="field" value={draft.method} onChange={(event) => setDraft({ ...draft, method: event.target.value as ServiceDefinition['method'] })}><option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option></select></label>
              <label><span className="field-label">服务路径</span><input className="field font-mono" value={draft.path} onChange={(event) => setDraft({ ...draft, path: event.target.value })} /></label>
              <label className="md:col-span-2"><span className="field-label">功能说明</span><textarea className="field min-h-20" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
            </div>
          </div>

          <div className="grid gap-5 2xl:grid-cols-2">
            <div className="app-card overflow-hidden">
              <div className="panel-header"><div className="flex items-center gap-2"><Code2 size={17} className="text-primary-600" /><h3 className="section-title">Mock 响应</h3></div><button className="btn-ghost" onClick={() => navigator.clipboard?.writeText(responseText)}><Copy size={15} />复制</button></div>
              <textarea value={responseText} onChange={(event) => setResponseText(event.target.value)} spellCheck={false} className="min-h-[320px] w-full resize-y bg-secondary-900 p-5 font-mono text-xs leading-6 text-secondary-200 outline-none" />
            </div>
            <div className="app-card overflow-hidden">
              <div className="panel-header"><div className="flex items-center gap-2"><TerminalSquare size={17} className="text-primary-600" /><h3 className="section-title">在线测试</h3></div><button className="btn-primary" onClick={test} disabled={testing}><Play size={15} />{testing ? '请求中…' : '发送请求'}</button></div>
              <div className="min-h-[320px] p-5">
                <div className="rounded-xl border border-secondary-200 bg-secondary-50 p-4 font-mono text-xs"><span className={`mr-3 rounded px-2 py-1 font-bold ${methodStyle[draft.method]}`}>{draft.method}</span><span className="text-secondary-600">{draft.path}</span></div>
                {testing && <div className="flex min-h-48 flex-col items-center justify-center text-sm text-secondary-500"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" /><span className="mt-3">正在执行本地 Mock 服务…</span></div>}
                {result && !testing && <div className="mt-4 animate-slide-up"><div className="mb-3 flex items-center gap-2 text-sm font-medium text-accent-700"><CheckCircle2 size={17} />200 OK <span className="ml-auto flex items-center gap-1 text-xs font-normal text-secondary-400"><Clock3 size={13} />{result.time} ms</span></div><pre className="overflow-auto rounded-xl bg-secondary-900 p-4 text-xs leading-6 text-accent-200">{JSON.stringify(result.body, null, 2)}</pre></div>}
                {!result && !testing && <div className="empty-state mt-4 border-0"><Play size={26} className="text-secondary-300" /><p className="mt-3 text-sm text-secondary-500">发送一次请求查看响应</p></div>}
              </div>
            </div>
          </div>
        </section>}
      </div>
    </div>
  )
}
