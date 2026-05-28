import {
	createSignal,
	createMemo,
	onMount,
	onCleanup,
	JSX,
	Accessor,
	splitProps,
} from 'solid-js';

type RangeProps = {
	value?: number;
	defaultValue?: number;
	min?: number;
	max?: number;
	step?: number;
	disabled?: boolean;
	showValue?: boolean;

	onInput?: (value: number) => void;
	onChange?: (value: number) => void;

	class?: string;
	thumbClass?: string;
	trackClass?: string;
	fillClass?: string;
};

export function Range(props: RangeProps) {
	const [local] = splitProps(props, [
		'value',
		'defaultValue',
		'min',
		'max',
		'step',
		'disabled',
		'onInput',
		'onChange',
		'class',
		'showValue',
		'thumbClass',
		'trackClass',
		'fillClass',
	]);

	let trackRef!: HTMLDivElement;

	const min = () => local.min ?? 0;
	const max = () => local.max ?? 100;
	const step = () => local.step ?? 1;

	const isControlled = () => local.value !== undefined;

	const [internalValue, setInternalValue] = createSignal(
		local.defaultValue ?? min(),
	);

	const value = createMemo(() =>
		isControlled() ? local.value! : internalValue(),
	);

	const percent = createMemo(() => {
		return ((value() - min()) / (max() - min())) * 100;
	});

	const clamp = (v: number) => {
		return Math.min(max(), Math.max(min(), v));
	};

	const snap = (v: number) => {
		const stepped = Math.round((v - min()) / step()) * step() + min();

		return Number(clamp(stepped).toFixed(4));
	};

	const updateValue = (v: number, triggerChange = false) => {
		if (local.disabled) return;

		const next = snap(v);

		if (!isControlled()) {
			setInternalValue(next);
		}

		local.onInput?.(next);

		if (triggerChange) {
			local.onChange?.(next);
		}
	};

	const getValueFromPointer = (clientX: number) => {
		const rect = trackRef.getBoundingClientRect();

		const x = clientX - rect.left;
		const ratio = x / rect.width;

		return min() + ratio * (max() - min());
	};

	const onPointerDown = (e: PointerEvent) => {
		if (local.disabled) return;

		e.preventDefault();

		updateValue(getValueFromPointer(e.clientX));

		const move = (event: PointerEvent) => {
			updateValue(getValueFromPointer(event.clientX));
		};

		const up = (event: PointerEvent) => {
			updateValue(getValueFromPointer(event.clientX), true);

			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
		};

		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
	};

	const onKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = e => {
		if (local.disabled) return;

		switch (e.key) {
			case 'ArrowRight':
			case 'ArrowUp':
				e.preventDefault();
				updateValue(value() + step(), true);
				break;

			case 'ArrowLeft':
			case 'ArrowDown':
				e.preventDefault();
				updateValue(value() - step(), true);
				break;

			case 'Home':
				e.preventDefault();
				updateValue(min(), true);
				break;

			case 'End':
				e.preventDefault();
				updateValue(max(), true);
				break;
		}
	};

	return (
		<div class={local.class}>
			<div
				ref={trackRef}
				tabIndex={local.disabled ? -1 : 0}
				role='slider'
				aria-valuemin={min()}
				aria-valuemax={max()}
				aria-valuenow={value()}
				onPointerDown={onPointerDown}
				onKeyDown={onKeyDown}
				class={`
					relative h-0.5 w-full rounded-full
					bg-zinc-700 cursor-pointer
					${local.disabled ? 'opacity-50 pointer-events-none' : ''}
					${local.trackClass ?? ''}
				`}
			>
				<div
					class={`
						absolute left-0 top-0 h-full rounded-full
						bg-primary
						${local.fillClass ?? ''}
					`}
					style={{
						width: `${percent()}%`,
					}}
				/>

				<div
					class={`
		absolute top-1/2 -translate-x-1/2 -translate-y-1/2
		flex items-center justify-center
		w-6 h-6
		cursor-grab active:cursor-grabbing
		${local.thumbClass ?? ''}
	`}
					style={{
						left: `${percent()}%`,
					}}
				>
					<div
						class='
			w-2 h-2 rounded-full
			bg-primary
			border border-border
			shadow-md
			pointer-events-none
		'
					/>
				</div>
			</div>

			{local.showValue && <div class='mt-2 text-sm text-zinc-400'>{value()}</div>}
		</div>
	);
}
