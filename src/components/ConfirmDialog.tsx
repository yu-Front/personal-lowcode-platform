import { AlertTriangle, LoaderCircle, Trash2, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmText?: string
  variant?: 'danger' | 'warning'
  warningText?: string
  busy?: boolean
  onCancel: () => void
  onConfirm: () => void | Promise<void>
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText = '确认删除',
  variant = 'danger',
  warningText,
  busy = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [open, busy, onCancel])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-secondary-950/45 p-4 backdrop-blur-sm"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel() }}
    >
      <section role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description" className="w-full max-w-md animate-slide-up overflow-hidden rounded-3xl border border-white/70 bg-white shadow-float">
        <div className="flex items-start gap-4 p-6 sm:p-7">
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ring-1 ring-inset ${variant === 'danger' ? 'bg-red-50 text-red-600 ring-red-100' : 'bg-amber-50 text-amber-600 ring-amber-100'}`}>{variant === 'danger' ? <Trash2 size={21} /> : <AlertTriangle size={22} />}</span>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-dialog-title" className="text-lg font-semibold text-secondary-900">{title}</h2>
            <p id="confirm-dialog-description" className="mt-2 text-sm leading-6 text-secondary-500">{description}</p>
          </div>
          <button type="button" disabled={busy} onClick={onCancel} className="rounded-xl p-2 text-secondary-400 transition hover:bg-secondary-100 hover:text-secondary-700 disabled:opacity-40" aria-label="关闭确认弹窗"><X size={18} /></button>
        </div>
        <div className="mx-6 flex items-start gap-2.5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800 sm:mx-7"><AlertTriangle size={15} className="mt-0.5 shrink-0" /><span>{warningText ?? (variant === 'danger' ? '删除后无法恢复，请确认当前内容不再需要。' : '此操作会覆盖现有数据，请确认已完成必要备份。')}</span></div>
        <div className="mt-6 flex justify-end gap-3 border-t border-secondary-100 bg-secondary-50 px-6 py-4 sm:px-7">
          <button ref={cancelRef} type="button" className="btn-secondary" disabled={busy} onClick={onCancel}>取消</button>
          <button type="button" className={`${variant === 'danger' ? 'btn-danger border-red-600 bg-red-600 text-white hover:bg-red-700' : 'btn-primary'} min-w-28`} disabled={busy} aria-busy={busy} onClick={onConfirm}>{busy ? <LoaderCircle size={16} className="animate-spin" /> : variant === 'danger' ? <Trash2 size={16} /> : <AlertTriangle size={16} />}{busy ? '正在处理…' : confirmText}</button>
        </div>
      </section>
    </div>,
    document.body,
  )
}
