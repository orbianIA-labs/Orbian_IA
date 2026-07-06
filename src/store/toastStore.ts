import { create } from 'zustand'

export type ToastType = 'info' | 'warning' | 'success' | 'error'
export interface Toast { id: number; message: string; type: ToastType }

interface ToastState {
  toasts: Toast[]
  push: (message: string, type?: ToastType) => void
  remove: (id: number) => void
}

let nextId = 1

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, type = 'info') => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3800)
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

/** Atalho para disparar um toast de qualquer lugar (fora de componentes React inclusive). */
export const toast = (message: string, type?: ToastType) => useToastStore.getState().push(message, type)
