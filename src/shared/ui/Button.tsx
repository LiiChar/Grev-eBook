// src/components/ui/Button.tsx
import { Component, JSX, Show, splitProps } from 'solid-js';
import clsx from 'clsx';

type ButtonColor =
	| 'neutral'
	| 'primary'
	| 'secondary'
	| 'accent'
	| 'info'
	| 'success'
	| 'warning'
	| 'error';

type ButtonVariant = 'solid' | 'outline' | 'soft' | 'ghost' | 'link' | 'dash';

type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
	color?: ButtonColor;
	variant?: ButtonVariant;
	size?: ButtonSize;

	active?: boolean;
	loading?: boolean;

	block?: boolean;
	wide?: boolean;

	square?: boolean;
	circle?: boolean;

	leftIcon?: JSX.Element;
	rightIcon?: JSX.Element;

	children?: JSX.Element;
}

const colorStyles: Record<ButtonColor, Record<ButtonVariant, string>> = {
	primary: {
		solid:
			'bg-primary text-primary-foreground hover:bg-primary/60',

		outline:
			'border border-primary text-primary bg-transparent hover:bg-primary/10',

		soft: 'bg-primary/10 text-primary hover:bg-primary/15',

		ghost: 'bg-transparent text-primary hover:bg-primary/10',

		link: 'bg-transparent text-primary hover:underline',

		dash:
			'border border-dashed border-primary text-primary hover:bg-primary/10',
	},

	secondary: {
		solid: 'bg-accent text-white hover:bg-accent/60',

		outline:
			'border border-accent text-accent bg-transparent hover:bg-accent/10',

		soft: 'bg-accent/10 text-accent hover:bg-accent/15',

		ghost: 'bg-transparent text-accent hover:bg-accent/10',

		link: 'bg-transparent text-accent hover:underline',

		dash:
			'border border-dashed border-accent text-accent hover:bg-accent/10',
	},

	neutral: {
		solid:
			'bg-secondary/60 text-foreground border border-border hover:bg-secondary/60',

		outline:
			'border border-border text-foreground bg-transparent hover:bg-secondary/60',

		soft: 'bg-secondary/60 text-foreground hover:bg-secondary/60',

		ghost: 'bg-transparent text-foreground hover:bg-secondary/60',

		link:
			'bg-transparent text-muted-foreground hover:text-foreground hover:underline',

		dash:
			'border border-dashed border-border text-foreground hover:bg-secondary/60',
	},

	accent: {
		solid: 'bg-cyan-500 text-white hover:bg-cyan-600',

		outline:
			'border border-cyan-500 text-cyan-500 bg-transparent hover:bg-cyan-500/10',

		soft: 'bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/15',

		ghost: 'bg-transparent text-cyan-500 hover:bg-cyan-500/10',

		link: 'bg-transparent text-cyan-500 hover:underline',

		dash:
			'border border-dashed border-cyan-500 text-cyan-500 hover:bg-cyan-500/10',
	},

	info: {
		solid: 'bg-blue-500 text-white hover:bg-blue-600',

		outline:
			'border border-blue-500 text-blue-500 bg-transparent hover:bg-blue-500/10',

		soft: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/15',

		ghost: 'bg-transparent text-blue-500 hover:bg-blue-500/10',

		link: 'bg-transparent text-blue-500 hover:underline',

		dash:
			'border border-dashed border-blue-500 text-blue-500 hover:bg-blue-500/10',
	},

	success: {
		solid: 'bg-emerald-500 text-white hover:bg-emerald-600',

		outline:
			'border border-emerald-500 text-emerald-500 bg-transparent hover:bg-emerald-500/10',

		soft: 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15',

		ghost: 'bg-transparent text-emerald-500 hover:bg-emerald-500/10',

		link: 'bg-transparent text-emerald-500 hover:underline',

		dash:
			'border border-dashed border-emerald-500 text-emerald-500 hover:bg-emerald-500/10',
	},

	warning: {
		solid: 'bg-amber-400 text-black hover:bg-amber-500',

		outline:
			'border border-amber-400 text-amber-500 bg-transparent hover:bg-amber-400/10',

		soft: 'bg-amber-400/10 text-amber-600 hover:bg-amber-400/15',

		ghost: 'bg-transparent text-amber-500 hover:bg-amber-400/10',

		link: 'bg-transparent text-amber-500 hover:underline',

		dash:
			'border border-dashed border-amber-400 text-amber-500 hover:bg-amber-400/10',
	},

	error: {
		solid: 'bg-red-500 text-white hover:bg-red-600',

		outline:
			'border border-red-500 text-red-500 bg-transparent hover:bg-red-500/10',

		soft: 'bg-red-500/10 text-red-500 hover:bg-red-500/15',

		ghost: 'bg-transparent text-red-500 hover:bg-red-500/10',

		link: 'bg-transparent text-red-500 hover:underline',

		dash: 'border border-dashed border-red-500 text-red-500 hover:bg-red-500/10',
	},
};

const sizeStyles: Record<ButtonSize, string> = {
	xs: 'h-7 px-2.5 text-xs rounded-(--radius-sm)',
	sm: 'h-9 px-3 text-sm rounded-(--radius-sm)',
	md: 'h-11 px-4 text-sm rounded-(--radius)',
	lg: 'h-13 px-5 text-base rounded-(--radius-lg)',
	xl: 'h-15 px-6 text-lg rounded-(--radius-xl)',
};

const Button: Component<ButtonProps> = props => {
	const [local, rest] = splitProps(props, [
		'class',
		'children',

		'color',
		'variant',
		'size',

		'active',
		'loading',
		'disabled',

		'block',
		'wide',

		'square',
		'circle',

		'leftIcon',
		'rightIcon',
	]);

	const color = () => local.color ?? 'primary';
	const variant = () => local.variant ?? 'solid';
	const size = () => local.size ?? 'md';

	return (
		<button
			{...rest}
			disabled={local.disabled || local.loading}
			class={clsx(
				/* base */
				[
					'inline-flex items-center justify-center gap-2',
					'font-medium whitespace-nowrap',
					'transition-all duration-200',
					'select-none',
					'outline-none',

					'focus-visible:ring-4',
					'focus-visible:ring-ring',

					'disabled:pointer-events-none',
					'disabled:opacity-50',

					'active:scale-[0.98]',

					'shadow-sm',
					'hover:shadow-md',
				],

				/* size */
				sizeStyles[size()],

				/* variant + color */
				colorStyles[color()][variant()],

				/* modifiers */
				{
					'w-full': local.block,
					'px-8': local.wide,

					'aspect-square px-0': local.square,
					'rounded-full aspect-square px-0': local.circle,

					'ring-2 ring-primary': local.active,
				},

				local.class,
			)}
		>
			<Show when={local.loading}>
				<span
					class={clsx(
						'size-4 animate-spin rounded-full',
						'border-2 border-current border-r-transparent',
					)}
				/>
			</Show>

			<Show when={!local.loading && local.leftIcon}>
				<span class='shrink-0'>{local.leftIcon}</span>
			</Show>

			<Show when={local.children}>
				<span>{local.children}</span>
			</Show>

			<Show when={!local.loading && local.rightIcon}>
				<span class='shrink-0'>{local.rightIcon}</span>
			</Show>
		</button>
	);
};

export default Button;
