// Global toast notification queue.
//
//   const toast = useToast()
//   toast.success('Saved.')
//   toast.error('Generation failed.', { description: err.message })
//   toast.info('Cached.', { duration: 3000 })
//
// The stack is rendered globally by <ToastStack /> in App.vue and
// teleported into <body> so toasts float above everything.

import { ref, type Ref } from 'vue'

export type ToastVariant = 'info' | 'success' | 'error'

export interface ToastEntry {
  id: number
  variant: ToastVariant
  title: string
  description?: string
  /** Auto-dismiss after this many ms. Set 0 to require manual dismiss. */
  duration: number
}

export interface ToastOptions {
  description?: string
  /** Override the default auto-dismiss duration (4000 ms). Set 0 for sticky. */
  duration?: number
}

const DEFAULT_DURATION = 4000
const ERROR_DURATION = 6000   // errors get a bit more dwell time

let nextId = 1
const items = ref<ToastEntry[]>([])

function add(variant: ToastVariant, title: string, opts: ToastOptions = {}) {
  const id = nextId++
  const duration = opts.duration !== undefined
    ? opts.duration
    : variant === 'error' ? ERROR_DURATION : DEFAULT_DURATION
  items.value = [...items.value, {
    id, variant, title,
    description: opts.description,
    duration
  }]
  if (duration > 0) {
    setTimeout(() => remove(id), duration)
  }
}

function remove(id: number) {
  items.value = items.value.filter(t => t.id !== id)
}

export interface ToastApi {
  items: Ref<ToastEntry[]>
  info: (title: string, opts?: ToastOptions) => void
  success: (title: string, opts?: ToastOptions) => void
  error: (title: string, opts?: ToastOptions) => void
  dismiss: (id: number) => void
  clear: () => void
}

export function useToast(): ToastApi {
  return {
    items,
    info(title, opts) { add('info', title, opts) },
    success(title, opts) { add('success', title, opts) },
    error(title, opts) { add('error', title, opts) },
    dismiss(id) { remove(id) },
    clear() { items.value = [] }
  }
}
