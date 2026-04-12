import { createSignal, For, onMount, onCleanup, JSX } from 'solid-js';

export type SelectOption<T extends string = string> = {
	value: T;
	label: string;
	icon?: JSX.Element;
};

export type SelectProps<T extends string> = {
	value: T;
	onChange: (value: T) => void;
	options: SelectOption<T>[];
	placeholder?: string;
	class?: string;

	/** Кастомный элемент снизу (например "Создать") */
	extraSlot?: JSX.Element;
};

export const Select = <T extends string>(props: SelectProps<T>) => {
	const [open, setOpen] = createSignal(false);
	let ref!: HTMLDivElement;

	const selected = () => props.options.find(o => o.value === props.value);

	const onClickOutside = (e: MouseEvent) => {
		if (!ref.contains(e.target as Node)) {
			setOpen(false);
		}
	};

	onMount(() => document.addEventListener('mousedown', onClickOutside));
	onCleanup(() => document.removeEventListener('mousedown', onClickOutside));

	return (
		<div ref={ref} class={`relative ${props.class ?? ''}`}>
			{/* Trigger */}
			<button
				type='button'
				onClick={() => setOpen(p => !p)}
				class='
          w-full flex items-center justify-between gap-2
          px-3 py-2 text-sm
          rounded-[var(--radius)]
          border border-[var(--border)]
          bg-[var(--surface)]
          text-[var(--foreground)]
          backdrop-blur-[var(--glass-blur)]
          shadow-[var(--glass-shadow)]
          hover:bg-[var(--surface-hover)]
          focus:outline-none
          focus:ring-2 focus:ring-[var(--ring)]
        '
			>
				<span class='flex items-center gap-2 truncate'>
					{selected()?.icon}
					{selected()?.label ?? props.placeholder ?? 'Выберите'}
				</span>

				<ChevronIcon open={open()} />
			</button>

			{/* Dropdown */}
			{open() && (
				<div
					class='
            absolute z-50 mt-1 w-full overflow-hidden
            rounded-[var(--radius-lg)]
            border border-[var(--border)]
            bg-[var(--surface)]
            backdrop-blur-[var(--glass-blur)]
            shadow-[var(--glass-shadow)]
          '
				>
					<For each={props.options}>
						{option => (
							<button
								type='button'
								onClick={() => {
									props.onChange(option.value);
									setOpen(false);
								}}
								class={`
                  w-full px-3 py-2 text-left text-sm
                  flex items-center gap-2
                  hover:bg-[var(--surface-hover)]
                  ${
										option.value === props.value
											? 'text-[var(--primary)]'
											: 'text-[var(--foreground)]'
									}
                `}
							>
								{option.icon}
								{option.label}
							</button>
						)}
					</For>

					{/* Кастомный элемент */}
					{props.extraSlot && (
						<>
							<div class='h-px bg-[var(--border)] my-1' />
							<div class='p-2'>{props.extraSlot}</div>
						</>
					)}
				</div>
			)}
		</div>
	);
};

export const ChevronIcon = (props: { open: boolean }) => (
	<svg
		class={`w-4 h-4 transition-transform ${props.open ? 'rotate-180' : ''}`}
		viewBox='0 0 20 20'
		fill='currentColor'
	>
		<path d='M5.25 7.5L10 12.25L14.75 7.5' />
	</svg>
);