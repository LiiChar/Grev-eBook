import { For, Show } from 'solid-js';
import { toasts, toast, type ToastType } from '../stores/toastStore';
import { Icon } from './Icon';

const typeStyles: Record<ToastType, { bg: string; icon: 'check' | 'info' | 'exclamation' | 'x' }> = {
  info: { bg: 'bg-[var(--primary)]/10 border-[var(--primary)]/30', icon: 'info' },
  success: { bg: 'bg-green-500/10 border-green-500/30', icon: 'check' },
  warning: { bg: 'bg-amber-500/10 border-amber-500/30', icon: 'exclamation' },
  error: { bg: 'bg-red-500/10 border-red-500/30', icon: 'x' },
};

const iconColors: Record<ToastType, string> = {
  info: 'text-[var(--primary)]',
  success: 'text-green-500',
  warning: 'text-amber-500',
  error: 'text-red-500',
};

export function Toaster() {
  return (
    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      <For each={toasts}>
        {(item, index) => (
          <div
            class={`
              glass rounded-xl px-4 py-3 flex items-start gap-3
              animate-slide-in-right
              ${typeStyles[item.type].bg}
            `}
            style={{ 'animation-delay': `${index() * 0.05}s` }}
          >
            <Icon
              name={typeStyles[item.type].icon}
              size={18}
              class={`mt-0.5 ${iconColors[item.type]}`}
            />
            <p class="flex-1 text-sm text-[var(--foreground)]">{item.message}</p>
            <button
              onClick={() => toast.dismiss(item.id)}
              class="text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        )}
      </For>
    </div>
  );
}

