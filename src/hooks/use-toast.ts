"use client"

interface ToastProps {
  title: string
  description?: string
  variant?: string
}

export function toast(props: ToastProps): void {
  const message = props.title + (props.description ? `: ${props.description}` : '')
  console.log('[Toast]', message)
  if (typeof window !== 'undefined') {
    alert(message)
  }
}

export function useToast() {
  return {
    toasts: [] as Array<{ id: string; title?: string; description?: string }>,
    toast: toast,
    dismiss: function(id?: string) {},
  }
}