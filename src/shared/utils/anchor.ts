import { ReadingPosition } from "../api/reader";

export function getReadingAnchor(
	root: HTMLElement,
	chapterId: string,
	customSentence?: string,
): ReadingPosition | null {
	const createWalker = () =>
		document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
			acceptNode(node) {
				if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
				if (node.parentElement?.tagName === 'MARK')
					return NodeFilter.FILTER_REJECT;
				return NodeFilter.FILTER_ACCEPT;
			},
		});

	// =====================================
	// 1️⃣ ПРИОРИТЕТ: кастомное предложение
	// =====================================
	if (customSentence) {
		const walker = createWalker();

		while (walker.nextNode()) {
			const node = walker.currentNode as Text;
			const text = node.textContent!.replace(/\s+/g, ' ');

			const index = text.indexOf(customSentence);
			if (index !== -1) {
				const start = Math.max(0, index - 40);
				const end = Math.min(text.length, index + customSentence.length + 40);

				return {
					chapter_id: chapterId,
					anchor_text: customSentence.slice(0, 80),
					before: text.slice(start, index),
					after: text.slice(index + customSentence.length, end),
				};
			}
		}
	}

	// =====================================
	// 2️⃣ ФОЛБЭК: центр экрана
	// =====================================
	const walker = createWalker();
	const centerY = root.scrollTop + root.clientHeight / 2;

	while (walker.nextNode()) {
		const node = walker.currentNode as Text;
		const range = document.createRange();
		range.selectNodeContents(node);

		const rect = range.getBoundingClientRect();
		const nodeTop = rect.top + root.scrollTop;

		if (nodeTop <= centerY && nodeTop + rect.height >= centerY) {
			const text = node.textContent!.replace(/\s+/g, ' ').trim();

			return {
				chapter_id: chapterId,
				anchor_text: text.slice(0, 80),
				before: text.slice(0, 40),
				after: text.slice(40, 80),
			};
		}
	}

	return null;
}

export function scrollToAnchor(root: HTMLElement, anchor: ReadingPosition) {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

	let bestMatch: { node: Text; index: number } | null = null;

	while (walker.nextNode()) {
		const node = walker.currentNode as Text;
		const content = node.textContent ?? '';

		// 1️⃣ Точное совпадение
		const idx = content.indexOf(anchor.anchor_text);
		if (idx !== -1) {
			bestMatch = { node, index: idx };
			break;
		}

		// 2️⃣ Контекстное совпадение
		if (anchor.before && anchor.after) {
			if (content.includes(anchor.before) && content.includes(anchor.after)) {
				bestMatch = {
					node,
					index: content.indexOf(anchor.before),
				};
			}
		}
	}

	if (!bestMatch) {
		root.scrollTo({ top: 0 });
		return false;
	}

	const range = document.createRange();
	range.setStart(bestMatch.node, bestMatch.index);
	range.setEnd(bestMatch.node, bestMatch.index + anchor.anchor_text.length);

	const rect = range.getBoundingClientRect();

	root.scrollTo({
		top: rect.top + root.scrollTop - 120,
		behavior: 'smooth',
	});

	return true;
}

