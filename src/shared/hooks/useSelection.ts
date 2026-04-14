import { Accessor, createSignal, onCleanup, onMount } from 'solid-js';

type UseSelectionProps = {
	onSelect?: (range: Range | null, selection: Selection | null) => void; // финал
	onSelection?: (range: Range | null) => void; // в процессе
};

type UseSelectionReturn = {
	isSelect: Accessor<boolean>;
	range: Accessor<Range | null>;
};

export const useSelection = (
	target: HTMLElement | string,
	opt?: UseSelectionProps,
): UseSelectionReturn => {
	const [range, setRange] = createSignal<Range | null>(null);
	const [isSelect, setIsSelect] = createSignal(false);

	let el: HTMLElement | null = null;
	let lastRange: [Range | null, Selection | null] = [null, null];

	const resolveElement = () => {
		if (typeof target === 'string') {
			return document.querySelector<HTMLElement>(target) ?? document.body;
		}
		return target;
	};

	const getValidRange = (): [Range | null, Selection | null] => {
		const selection = window.getSelection();

		if (!selection || selection.rangeCount === 0) return [null, null];


		const r = selection.getRangeAt(0);

		if (!el || !el.contains(r.commonAncestorContainer)) return [null, null];
		if (selection.isCollapsed) return [null, null];

		return [r, selection];
	};

	// 🔄 вызывается постоянно
	const handleSelectionChange = () => {
		const [r, s] = getValidRange();

		lastRange = [r, s];

		if (!r) {
			setRange(null);
			setIsSelect(false);
			opt?.onSelection?.(null);
			return;
		}

		setRange(r);
		setIsSelect(true);
		opt?.onSelection?.(r);
	};

	// ✅ вызывается по завершению
	const handlePointerUp = () => {
		opt?.onSelect?.(lastRange[0], lastRange[1]);
	};

	onMount(() => {
		el = resolveElement();
		if (!el) return;

		document.addEventListener('selectionchange', handleSelectionChange);

		// 🔥 финал выделения
		document.addEventListener('mouseup', handlePointerUp);
		document.addEventListener('touchend', handlePointerUp);
	});

	onCleanup(() => {
		document.removeEventListener('selectionchange', handleSelectionChange);
		document.removeEventListener('mouseup', handlePointerUp);
		document.removeEventListener('touchend', handlePointerUp);
	});

	return {
		range,
		isSelect,
	};
};
