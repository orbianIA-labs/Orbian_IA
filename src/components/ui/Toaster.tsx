import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useToastStore, type ToastType } from '@/store/toastStore'

const ICON: Record<ToastType, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
  error: XCircle,
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const remove = useToastStore((s) => s.remove)

  if (toasts.length === 0) return null

  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICON[t.type]
        return (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <Icon size={17} className="toast-icon" />
            <span>{t.message}</span>
            <button className="toast-close" onClick={() => remove(t.id)} aria-label="Fechar">
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
