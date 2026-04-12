import { createStore, produce } from 'solid-js/store';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export type ToastItem = {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
};

const [toasts, setToasts] = createStore<ToastItem[]>([]);

let toastId = 0;

function addToast(type: ToastType, message: string, duration = 3000) {
  const id = `toast-${++toastId}`;
  const item: ToastItem = { id, type, message, duration };

  setToasts(produce((t) => t.push(item)));

  if (duration > 0) {
    setTimeout(() => removeToast(id), duration);
  }

  return id;
}

function removeToast(id: string) {
  setToasts((t) => t.filter((item) => item.id !== id));
}

export const toast = {
  info: (message: string, duration?: number) => addToast('info', message, duration),
  success: (message: string, duration?: number) => addToast('success', message, duration),
  warning: (message: string, duration?: number) => addToast('warning', message, duration),
  error: (message: string, duration?: number) => addToast('error', message, duration ?? 5000),
  dismiss: removeToast,
  dismissAll: () => setToasts([]),
};

export { toasts };

