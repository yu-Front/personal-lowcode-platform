import {
  AlignLeft, CalendarDays, ChevronDown, ChevronUp, Columns3, Component, CreditCard, Heading,
  List, LoaderCircle, MousePointerClick, Plus, Save, Square, Table2, Trash2, Type,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import ConfirmDialog from '../../components/ConfirmDialog'
import NoticeDialog from '../../components/NoticeDialog'
import PageHeader from '../../components/PageHeader'
import { findResourceReferences, referenceMessage } from '../../domain/dependencyGraph'
import { useWorkspace } from '../../state/WorkspaceContext'
import type { ComponentType, PageComponent, PageSchema } from '../../types/workspace'
import { delay } from '../../utils/async'

const palette: { type: ComponentType; label: string; icon: typeof Type }[] = [
  { type: 'container', label: '分组容器', icon: Square }, { type: 'heading', label: '标题', icon: Heading },
  { type: 'text', label: '说明文本', icon: AlignLeft }, { type: 'input', label: '文本输入', icon: Type },
  { type: 'currency', label: '金额输入', icon: CreditCard }, { type: 'select', label: '下拉选择', icon: List },
  { type: 'date', label: '日期选择', icon: CalendarDays }, { type: 'button', label: '操作按钮', icon: MousePointerClick },
  { type: 'table', label: '数据表格', icon: Table2 },
]

const defaultLabels: Record<ComponentType, string> = {
  container: '内容分组', heading: '页面标题', text: '说明文本', input: '文本字段', currency: '金额字段',
  select: '选择字段', date: '日期字段', button: '提交', table: '数据列表',
}

const widthClass = { full: 'col-span-12', half: 'col-span-12 md:col-span-6', third: 'col-span-12 md:col-span-4' }

function ComponentPreview({ component }: { component: PageComponent }) {
  if (component.type === 'heading') return <h3 className="text-xl font-semibold text-secondary-900">{component.label}</h3>
  if (component.type === 'text') return <p className="text-sm leading-6 text-secondary-500">{component.label}</p>
  if (component.type === 'container') return <div className="rounded-xl border border-dashed border-primary-200 bg-primary-50/60 p-4 text-sm font-medium text-primary-700">{component.label}</div>
  if (component.type === 'button') return <div className="btn-primary pointer-events-none w-full">{component.label}</div>
  if (component.type === 'table') return <div className="overflow-hidden rounded-xl border border-secondary-200"><div className="grid grid-cols-3 bg-secondary-50 px-3 py-2 text-xs font-medium text-secondary-500"><span>申请单</span><span>金额</span><span>状态</span></div><div className="grid grid-cols-3 px-3 py-3 text-xs text-secondary-400"><span>PR-0001</span><span>¥ 12,800</span><span>审批中</span></div></div>
  return <label><span className="field-label">{component.label}</span><div className="field flex min-h-10 items-center justify-between text-secondary-400"><span>{component.placeholder || `请输入${component.label}`}</span>{component.type === 'select' && <ChevronDown size={15} />}{component.type === 'date' && <CalendarDays size={15} />}</div></label>
}

export default function PageDesigner() {
  const { workspace, saveState, updatePage, addPage, deletePage } = useWorkspace()
  const [pageId, setPageId] = useState(workspace.pages[0]?.id ?? '')
  const source = workspace.pages.find((page) => page.id === pageId) ?? workspace.pages[0]
  const emptyPage: PageSchema = { id: '', name: '', route: '', description: '', objectId: '', components: [], updatedAt: '' }
  const [draft, setDraft] = useState<PageSchema>(source ? structuredClone(source) : emptyPage)
  const [selectedId, setSelectedId] = useState(source?.components[0]?.id ?? '')
  const [saved, setSaved] = useState(false)
  const [notice, setNotice] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [componentDeleteTarget, setComponentDeleteTarget] = useState<PageComponent | null>(null)
  useEffect(() => {
    if (source) {
      setPageId(source.id)
      setDraft(structuredClone(source))
      setSelectedId(source.components[0]?.id ?? '')
    }
  }, [source?.id])
  const selected = useMemo(() => draft.components.find((item) => item.id === selectedId), [draft.components, selectedId])
  const boundObject = workspace.objects.find((item) => item.id === draft.objectId)

  const addComponent = (type: ComponentType) => {
    const component: PageComponent = { id: `comp_${crypto.randomUUID()}`, type, label: defaultLabels[type], width: type === 'heading' || type === 'text' || type === 'container' || type === 'button' || type === 'table' ? 'full' : 'half' }
    setDraft({ ...draft, components: [...draft.components, component] })
    setSelectedId(component.id)
  }
  const updateSelected = (patch: Partial<PageComponent>) => setDraft({ ...draft, components: draft.components.map((item) => item.id === selectedId ? { ...item, ...patch } : item) })
  const move = (direction: -1 | 1) => {
    const index = draft.components.findIndex((item) => item.id === selectedId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= draft.components.length) return
    const components = [...draft.components]
    ;[components[index], components[target]] = [components[target], components[index]]
    setDraft({ ...draft, components })
  }
  const save = () => { updatePage(draft); setSaved(true); window.setTimeout(() => setSaved(false), 1600) }
  const createPage = () => {
    const id = addPage()
    if (id) { setPageId(id); setNotice('') }
  }
  const removePage = () => {
    const references = findResourceReferences(workspace, 'page', draft.id)
    if (references.length) { setNotice(referenceMessage(`页面「${draft.name}」`, references)); return }
    setConfirmOpen(true)
  }
  const confirmRemovePage = async () => {
    if (deleting) return
    setDeleting(true)
    await delay()
    const nextId = workspace.pages.find((page) => page.id !== draft.id)?.id ?? ''
    const result = deletePage(draft.id)
    if (!result.ok) { setNotice(referenceMessage(`页面「${draft.name}」`, result.references)); setDeleting(false); setConfirmOpen(false); return }
    setNotice('')
    setPageId(nextId)
    setSelectedId('')
    setDeleting(false)
    setConfirmOpen(false)
  }

  if (!source) return <div className="page-shell"><PageHeader eyebrow="Visual Page Builder" title="页面设计器" description="先创建数据对象，再建立页面并绑定对象字段。" actions={<button className="btn-primary" disabled={!workspace.objects.length} onClick={createPage}><Plus size={16} />新建页面</button>} /><div className="empty-state app-card min-h-[460px]"><Component size={34} className="text-secondary-300" /><h2 className="mt-4 font-semibold text-secondary-900">还没有页面</h2><p className="mt-2 max-w-md text-sm leading-6 text-secondary-500">{workspace.objects.length ? '创建第一个页面，开始组合组件和字段绑定。' : '页面需要绑定数据对象，请先前往“数据对象”创建对象。'}</p></div></div>

  return (
    <div className="page-shell max-w-none">
      <ConfirmDialog open={confirmOpen} title="删除页面" description={`确定删除「${draft.name}」吗？页面中的布局、组件和字段绑定都会一并移除。`} busy={deleting} onCancel={() => setConfirmOpen(false)} onConfirm={confirmRemovePage} />
      <ConfirmDialog open={componentDeleteTarget !== null} title="删除页面组件" description={`确定删除组件「${componentDeleteTarget?.label ?? ''}」吗？组件的字段绑定和布局配置也会一并移除。`} confirmText="删除组件" onCancel={() => setComponentDeleteTarget(null)} onConfirm={() => { if (componentDeleteTarget) setDraft({ ...draft, components: draft.components.filter((item) => item.id !== componentDeleteTarget.id) }); setSelectedId(''); setComponentDeleteTarget(null) }} />
      <PageHeader eyebrow="Visual Page Builder" title="页面设计器" description="通过组件、画布和属性面板配置页面。保存内容以 JSON DSL 形式写入 IndexedDB。" actions={<><select className="field min-w-40 py-2" value={source.id} onChange={(event) => { setPageId(event.target.value); setNotice('') }} aria-label="切换设计页面">{workspace.pages.map((page) => <option key={page.id} value={page.id}>{page.name}</option>)}</select><button className="btn-secondary" disabled={saveState === 'saving'} onClick={createPage}><Plus size={16} />新建页面</button><button className="btn-danger" disabled={saveState === 'saving'} onClick={removePage}><Trash2 size={16} />删除页面</button><button className="btn-primary" disabled={saveState === 'saving'} onClick={save} aria-busy={saveState === 'saving'}>{saveState === 'saving' ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}{saveState === 'saving' ? '正在保存…' : saved ? '已保存' : '保存页面'}</button></>} />
      <NoticeDialog open={Boolean(notice)} title="页面正在被使用" description={notice} onClose={() => setNotice('')} />
      <div className="grid min-h-[720px] gap-4 2xl:grid-cols-[240px_minmax(520px,1fr)_300px]">
        <aside className="app-card overflow-hidden">
          <div className="panel-header"><div><h2 className="section-title">组件库</h2><p className="mt-1 text-xs text-secondary-500">点击添加到画布</p></div><Component size={18} className="text-primary-600" /></div>
          <div className="grid grid-cols-2 gap-2 p-3 2xl:grid-cols-1">
            {palette.map((item) => <button key={item.type} onClick={() => addComponent(item.type)} className="group flex items-center gap-3 rounded-xl border border-secondary-100 bg-secondary-50 p-3 text-left transition hover:border-primary-200 hover:bg-primary-50"><span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-secondary-500 shadow-sm group-hover:text-primary-600"><item.icon size={16} /></span><span className="text-xs font-medium text-secondary-700">{item.label}</span><Plus size={14} className="ml-auto text-secondary-300 group-hover:text-primary-500" /></button>)}
          </div>
        </aside>

        <section className="app-card overflow-hidden bg-secondary-100">
          <div className="flex flex-wrap items-center gap-3 border-b border-secondary-200 bg-white px-4 py-3">
            <div className="flex-1"><input className="border-0 bg-transparent text-sm font-semibold text-secondary-900 outline-none" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /><div className="text-[11px] text-secondary-400">{draft.route}</div></div>
            <span className="badge-gray"><Columns3 size={13} />响应式栅格</span>
          </div>
          <div className="min-h-[650px] p-4 sm:p-7">
            <div className="mx-auto max-w-4xl rounded-2xl bg-white p-5 shadow-panel sm:p-7">
              <div className="mb-6 flex items-center justify-between border-b border-secondary-100 pb-4"><div><div className="text-xs font-medium text-primary-600">运行态表单</div><div className="mt-1 text-sm text-secondary-500">绑定对象：{boundObject?.name ?? '未绑定'}</div></div><span className="h-2.5 w-2.5 rounded-full bg-accent-400 ring-4 ring-accent-50" /></div>
              <div className="grid grid-cols-12 gap-4">
                {draft.components.map((component) => <button key={component.id} onClick={() => setSelectedId(component.id)} className={`${widthClass[component.width]} rounded-xl p-2 text-left transition ${selectedId === component.id ? 'bg-primary-50 ring-2 ring-primary-400' : 'hover:bg-secondary-50 hover:ring-1 hover:ring-secondary-200'}`}><ComponentPreview component={component} /></button>)}
              </div>
            </div>
          </div>
        </section>

        <aside className="app-card overflow-hidden">
          <div className="panel-header"><div><h2 className="section-title">属性面板</h2><p className="mt-1 text-xs text-secondary-500">配置选中的组件</p></div></div>
          {selected ? <div className="space-y-4 p-4">
            <div className="rounded-xl bg-primary-50 p-3"><div className="text-[11px] font-medium uppercase tracking-wider text-primary-500">Component</div><div className="mt-1 text-sm font-semibold text-primary-900">{palette.find((item) => item.type === selected.type)?.label}</div><div className="mt-1 truncate font-mono text-[10px] text-primary-400">{selected.id}</div></div>
            <label><span className="field-label">显示文案</span><input className="field" value={selected.label} onChange={(event) => updateSelected({ label: event.target.value })} /></label>
            <label><span className="field-label">字段绑定</span><select className="field" value={selected.binding ?? ''} onChange={(event) => updateSelected({ binding: event.target.value || undefined })}><option value="">不绑定</option>{boundObject?.fields.map((field) => <option key={field.id} value={field.code}>{field.name} · {field.code}</option>)}</select></label>
            <label><span className="field-label">组件宽度</span><select className="field" value={selected.width} onChange={(event) => updateSelected({ width: event.target.value as PageComponent['width'] })}><option value="full">整行 100%</option><option value="half">半行 50%</option><option value="third">三分之一</option></select></label>
            <label><span className="field-label">占位提示</span><input className="field" value={selected.placeholder ?? ''} onChange={(event) => updateSelected({ placeholder: event.target.value })} placeholder="输入提示文字" /></label>
            <div className="grid grid-cols-2 gap-2"><button className="btn-secondary" onClick={() => move(-1)}><ChevronUp size={16} />上移</button><button className="btn-secondary" onClick={() => move(1)}><ChevronDown size={16} />下移</button></div>
            <button className="btn-danger w-full" onClick={() => setComponentDeleteTarget(selected)}><Trash2 size={16} />删除组件</button>
          </div> : <div className="empty-state m-4 min-h-56"><MousePointerClick size={28} className="text-secondary-300" /><p className="mt-3 text-sm text-secondary-500">在画布中选择一个组件</p></div>}
        </aside>
      </div>
    </div>
  )
}
