import { Braces, Database, LoaderCircle, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import ConfirmDialog from '../../components/ConfirmDialog'
import NoticeDialog from '../../components/NoticeDialog'
import PageHeader from '../../components/PageHeader'
import { findResourceReferences, referenceMessage } from '../../domain/dependencyGraph'
import { useWorkspace } from '../../state/WorkspaceContext'
import type { DataObject, FieldType, ModelField } from '../../types/workspace'
import { delay } from '../../utils/async'

const fieldTypes: { value: FieldType; label: string }[] = [
  { value: 'text', label: '文本' }, { value: 'number', label: '数字' }, { value: 'currency', label: '金额' },
  { value: 'date', label: '日期' }, { value: 'enum', label: '枚举' }, { value: 'boolean', label: '布尔' },
]

const uid = () => `field_${crypto.randomUUID()}`

export default function ObjectStudio() {
  const { workspace, saveState, addObject, updateObject, deleteObject } = useWorkspace()
  const [selectedId, setSelectedId] = useState(workspace.objects[0]?.id ?? '')
  const selected = useMemo(() => workspace.objects.find((item) => item.id === selectedId), [workspace.objects, selectedId])
  const [draft, setDraft] = useState<DataObject | null>(selected ? structuredClone(selected) : null)
  const [saved, setSaved] = useState(false)
  const [notice, setNotice] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [fieldDeleteTarget, setFieldDeleteTarget] = useState<ModelField | null>(null)

  useEffect(() => setDraft(selected ? structuredClone(selected) : null), [selected])
  useEffect(() => { if (!selectedId && workspace.objects[0]) setSelectedId(workspace.objects[0].id) }, [workspace.objects, selectedId])

  const updateField = (id: string, patch: Partial<ModelField>) => setDraft((current) => current ? ({ ...current, fields: current.fields.map((field) => field.id === id ? { ...field, ...patch } : field) }) : current)
  const addField = () => setDraft((current) => current ? ({ ...current, fields: [...current.fields, { id: uid(), name: '新字段', code: `field_${current.fields.length + 1}`, type: 'text', required: false }] }) : current)
  const save = () => {
    if (!draft) return
    updateObject(draft)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1600)
  }
  const removeObject = () => {
    if (!draft) return
    const references = findResourceReferences(workspace, 'object', draft.id)
    if (references.length) { setNotice(referenceMessage(`数据对象「${draft.name}」`, references)); return }
    setConfirmOpen(true)
  }
  const confirmRemoveObject = async () => {
    if (!draft || deleting) return
    setDeleting(true)
    await delay()
    const nextId = workspace.objects.find((item) => item.id !== draft.id)?.id ?? ''
    const result = deleteObject(draft.id)
    if (!result.ok) { setNotice(referenceMessage(`数据对象「${draft.name}」`, result.references)); setDeleting(false); setConfirmOpen(false); return }
    setNotice('')
    setSelectedId(nextId)
    setDeleting(false)
    setConfirmOpen(false)
  }

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Data Modeling" title="数据对象" description="用业务语言定义数据结构。页面、服务和流程都会通过对象字段建立统一的数据契约。" actions={<button className="btn-primary" onClick={addObject}><Plus size={17} />新建对象</button>} />
      <ConfirmDialog open={confirmOpen} title="删除数据对象" description={`确定删除「${draft?.name ?? ''}」吗？与该对象相关的字段定义也会一并移除。`} busy={deleting} onCancel={() => setConfirmOpen(false)} onConfirm={confirmRemoveObject} />
      <ConfirmDialog open={fieldDeleteTarget !== null} title="删除字段" description={`确定删除字段「${fieldDeleteTarget?.name ?? ''}」吗？尚未保存的字段绑定配置可能会受到影响。`} confirmText="删除字段" onCancel={() => setFieldDeleteTarget(null)} onConfirm={() => { if (draft && fieldDeleteTarget) setDraft({ ...draft, fields: draft.fields.filter((item) => item.id !== fieldDeleteTarget.id) }); setFieldDeleteTarget(null) }} />
      <NoticeDialog open={Boolean(notice)} title="数据对象正在被使用" description={notice} onClose={() => setNotice('')} />
      <div className="grid min-h-[680px] gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="app-card overflow-hidden">
          <div className="panel-header"><div><h2 className="section-title">对象目录</h2><p className="mt-1 text-xs text-secondary-500">{workspace.objects.length} 个业务对象</p></div></div>
          <div className="space-y-1.5 p-3">
            {workspace.objects.map((object) => (
              <button key={object.id} onClick={() => setSelectedId(object.id)} className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition ${selectedId === object.id ? 'bg-primary-50 ring-1 ring-primary-200' : 'hover:bg-secondary-50'}`}>
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${selectedId === object.id ? 'bg-primary-600 text-white' : 'bg-secondary-100 text-secondary-500'}`}><Database size={17} /></span>
                <span className="min-w-0"><strong className="block truncate text-sm text-secondary-900">{object.name}</strong><small className="mt-0.5 block truncate font-mono text-[11px] text-secondary-400">{object.code}</small><small className="mt-1 block text-[11px] text-secondary-500">{object.fields.length} 个字段</small></span>
              </button>
            ))}
          </div>
        </aside>

        {draft ? <section className="app-card overflow-hidden">
          <div className="panel-header">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-50 text-primary-700"><Braces size={19} /></span><div><h2 className="section-title">对象定义</h2><p className="mt-1 text-xs text-secondary-500">更新后会自动影响可绑定字段</p></div></div>
            <div className="flex gap-2"><button className="btn-danger" disabled={saveState === 'saving'} onClick={removeObject}><Trash2 size={16} />删除</button><button className="btn-primary" disabled={saveState === 'saving'} onClick={save} aria-busy={saveState === 'saving'}>{saveState === 'saving' ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}{saveState === 'saving' ? '正在保存…' : saved ? '已保存' : '保存对象'}</button></div>
          </div>
          <div className="grid gap-4 border-b border-secondary-100 p-5 md:grid-cols-2">
            <label><span className="field-label">对象名称</span><input className="field" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
            <label><span className="field-label">对象编码</span><input className="field font-mono" value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value.replace(/\s/g, '_') })} /></label>
            <label className="md:col-span-2"><span className="field-label">业务说明</span><textarea className="field min-h-20 resize-y" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
          </div>
          <div className="flex items-center justify-between px-5 py-4"><div><h3 className="section-title">字段列表</h3><p className="mt-1 text-xs text-secondary-500">配置类型、必填规则与枚举选项</p></div><button className="btn-secondary" onClick={addField}><Plus size={16} />添加字段</button></div>
          <div className="overflow-x-auto px-5 pb-6">
            <table className="data-table"><thead><tr><th>显示名称</th><th>字段编码</th><th>数据类型</th><th>必填</th><th>枚举选项</th><th>操作</th></tr></thead><tbody>
              {draft.fields.map((field) => <tr key={field.id}>
                <td><input className="field min-w-32" value={field.name} onChange={(event) => updateField(field.id, { name: event.target.value })} /></td>
                <td><input className="field min-w-36 font-mono" value={field.code} onChange={(event) => updateField(field.id, { code: event.target.value.replace(/\s/g, '_') })} /></td>
                <td><select className="field min-w-28" value={field.type} onChange={(event) => updateField(field.id, { type: event.target.value as FieldType })}>{fieldTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></td>
                <td><label className="inline-flex cursor-pointer items-center gap-2 text-xs"><input type="checkbox" className="h-4 w-4 rounded border-secondary-300 text-primary-600" checked={field.required} onChange={(event) => updateField(field.id, { required: event.target.checked })} />必填</label></td>
                <td>{field.type === 'enum' ? <input className="field min-w-48" value={field.options?.join('、') ?? ''} placeholder="选项一、选项二" onChange={(event) => updateField(field.id, { options: event.target.value.split('、').filter(Boolean) })} /> : <span className="text-xs text-secondary-300">—</span>}</td>
                <td><button className="rounded-lg p-2 text-secondary-400 hover:bg-red-50 hover:text-red-600" onClick={() => setFieldDeleteTarget(field)} aria-label="删除字段"><Trash2 size={16} /></button></td>
              </tr>)}
            </tbody></table>
          </div>
        </section> : <div className="empty-state"><Database size={30} className="text-secondary-300" /><h3 className="mt-3 font-medium">还没有数据对象</h3><p className="mt-1 text-sm text-secondary-500">创建第一个对象开始搭建应用</p></div>}
      </div>
    </div>
  )
}
