import { AlertTriangle, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface NoticeDialogProps {
  open: boolean
  title?: string
  description: string
  onClose: () => void
}

export default function NoticeDialog({ open, title = '暂时无法执行此操作', description, onClose }: NoticeDialogProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    buttonRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[110] grid place-items-center bg-secondary-950/45 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section role="alertdialog" aria-modal="true" aria-labelledby="notice-dialog-title" aria-describedby="notice-dialog-description" className="w-full max-w-lg animate-slide-up overflow-hidden rounded-3xl border border-white/70 bg-white shadow-float">
        <div className="flex items-start gap-4 p-6 sm:p-7">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-100"><AlertTriangle size={22} /></span>
          <div className="min-w-0 flex-1"><h2 id="notice-dialog-title" className="text-lg font-semibold text-secondary-900">{title}</h2><p id="notice-dialog-description" className="mt-2 whitespace-pre-line text-sm leading-6 text-secondary-600">{description}</p></div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-secondary-400 transition hover:bg-secondary-100 hover:text-secondary-700" aria-label="关闭提示"><X size={18} /></button>
        </div>
        <div className="flex justify-end border-t border-secondary-100 bg-secondary-50 px-6 py-4 sm:px-7"><button ref={buttonRef} type="button" className="btn-primary min-w-24" onClick={onClose}>我知道了</button></div>
      </section>
    </div>,
    document.body,
  )
}
