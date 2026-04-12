import { JSX, splitProps, Show } from 'solid-js';

export type GlassButtonProps = {
  variant?: 'default' | 'primary' | 'accent' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  disabled?: boolean;
  children?: JSX.Element;
} & JSX.ButtonHTMLAttributes<HTMLButtonElement>;

export function GlassButton(props: GlassButtonProps) {
  const [local, rest] = splitProps(props, [
    'variant',
    'size',
    'loading',
    'disabled',
    'children',
    'class',
  ]);

  const baseStyles = `
    inline-flex items-center justify-center gap-2
    font-medium transition-all duration-150 ease-out
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
    disabled:opacity-50 disabled:pointer-events-none
    select-none cursor-pointer
  `;

  const variants: Record<string, string> = {
    default: `
      glass hover:bg-[var(--surface-hover)] active:bg-[var(--surface-active)]
      text-[var(--foreground)] focus-visible:ring-[var(--ring)]
    `,
    primary: `
      bg-[var(--primary)] hover:bg-[var(--primary-hover)]
      text-[var(--primary-foreground)] shadow-lg shadow-[var(--primary)]/20
      focus-visible:ring-[var(--primary)]
    `,
    accent: `
      bg-[var(--accent)] hover:bg-[var(--accent-hover)]
      text-[var(--accent-foreground)] shadow-lg shadow-[var(--accent)]/20
      focus-visible:ring-[var(--accent)]
    `,
    ghost: `
      bg-transparent hover:bg-[var(--surface)] active:bg-[var(--surface-hover)]
      text-[var(--foreground)] focus-visible:ring-[var(--ring)]
    `,
    destructive: `
      bg-[var(--destructive)] hover:bg-[var(--destructive-hover)]
      text-[var(--destructive-foreground)] shadow-lg shadow-[var(--destructive)]/20
      focus-visible:ring-[var(--destructive)]
    `,
  };

  const sizes: Record<string, string> = {
		sm: 'h-8 px-3 text-xs rounded-sm',
		md: 'h-10 px-4 text-sm rounded-md',
		lg: 'h-12 px-6 text-base rounded-lg',
		icon: 'h-10 w-10 rounded-md',
	};

  const classes = () => {
    const variant = variants[local.variant ?? 'default'];
    const size = sizes[local.size ?? 'md'];
    return `${baseStyles} ${variant} ${size} ${local.class ?? ''}`.trim().replace(/\s+/g, ' ');
  };

  return (
    <button
      {...rest}
      class={classes()}
      disabled={local.disabled || local.loading}
    >
      <Show when={local.loading}>
        <svg
          class="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </Show>
      <Show when={!local.loading}>
        {local.children}
      </Show>
    </button>
  );
}

