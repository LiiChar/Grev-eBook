export function getTextOffset(container: HTMLElement) {
	const blocks = container.querySelectorAll<HTMLElement>('[data-offset]');
	const scrollTop = container.scrollTop;

	for (const el of blocks) {
		if (el.offsetTop + el.offsetHeight > scrollTop) {
			return Number(el.dataset.offset);
		}
	}

	return 0;
}

export function scrollToOffset(container: HTMLElement, offset: number) {
	const blocks = container.querySelectorAll<HTMLElement>('[data-offset]');

	for (const el of blocks) {
		const elOffset = Number(el.dataset.offset);
		if (elOffset >= offset) {
			container.scrollTop = el.offsetTop;
			break;
		}
	}
}

export function getSelectionRange() {
	const sel = window.getSelection();
	if (!sel || sel.rangeCount === 0) return null;

	const range = sel.getRangeAt(0);
	const startEl = range.startContainer.parentElement;
	const endEl = range.endContainer.parentElement;

	return {
		start: Number(startEl?.dataset.offset),
		end: Number(endEl?.dataset.offset),
		quote: sel.toString(),
	};
}

