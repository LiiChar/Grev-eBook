import { ReadingPosition } from "../api/reader";

export function getReadingAnchor(
	root: HTMLElement,
	chapterId: string,
	customSentence?: string,
): [ReadingPosition, number] {
	const createWalker = () =>
		document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
			acceptNode(node) {
				if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
				if (node.parentElement?.tagName === 'MARK') return NodeFilter.FILTER_REJECT;
				return NodeFilter.FILTER_ACCEPT;
			},
		});

	let acc = 0;

	const countNode = (node: Text) =>
		(node.textContent || '').replace(/\s+/g, ' ').length;

	// дефолтный результат (если ничего не нашли)
	let fallback: [ReadingPosition, number] = [
		{
			chapter_id: chapterId,
			anchor_text: '',
			before: '',
			after: '',
		},
		0,
	];

	// =====================================
	// 1️⃣ кастомное предложение
	// =====================================
	if (customSentence) {
		const walker = createWalker();

		while (walker.nextNode()) {
			const node = walker.currentNode as Text;
			const text = node.textContent!.replace(/\s+/g, ' ');

			const index = text.indexOf(customSentence);

			if (index !== -1) {
				const globalOffset = acc + index;

				const start = Math.max(0, index - 40);
				const end = Math.min(text.length, index + customSentence.length + 40);

				return [
					{
						chapter_id: chapterId,
						anchor_text: customSentence.slice(0, 80),
						before: text.slice(start, index),
						after: text.slice(index + customSentence.length, end),
					},
					globalOffset,
				];
			}

			acc += countNode(node);
		}

		// если не нашли — возвращаем пустой результат, но с acc
		return [
			{
				chapter_id: chapterId,
				anchor_text: '',
				before: '',
				after: '',
			},
			acc,
		];
	}

	// =====================================
	// 2️⃣ центр экрана
	// =====================================
	// =====================================
	// 2️⃣ центр экрана / конец главы
	// =====================================

	const isNearBottom =
		root.scrollTop + root.clientHeight >= root.scrollHeight - 50;

	// Если дочитали до конца главы
	if (isNearBottom) {
		const walker = createWalker();

		let lastNode: Text | null = null;

		while (walker.nextNode()) {
			lastNode = walker.currentNode as Text;
			acc += countNode(lastNode);
		}

		if (lastNode) {
			const text = lastNode.textContent!.replace(/\s+/g, ' ').trim();

			return [
				{
					chapter_id: chapterId,
					anchor_text: text.slice(-80),
					before: text.slice(-80, -40),
					after: text.slice(-40),
				},
				acc,
			];
		}
	}

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

			const globalOffset = acc;

			return [
				{
					chapter_id: chapterId,
					anchor_text: text.slice(0, 80),
					before: text.slice(0, 40),
					after: text.slice(40, 80),
				},
				globalOffset,
			];
		}

		acc += countNode(node);
	}

	// ничего не нашли вообще
	return [
		{
			chapter_id: chapterId,
			anchor_text: '',
			before: '',
			after: '',
		},
		acc,
	];
}

export function scrollToAnchor(root: HTMLElement, anchor: ReadingPosition) {

	if (!anchor.anchor_text?.trim()) {
		const chapterEl = root.querySelector('[data-chapter-id]');

		if (chapterEl instanceof HTMLElement) {
			const top = chapterEl.getBoundingClientRect().top + root.scrollTop;

			root.scrollTo({
				top: Math.max(0, top - 120),
				behavior: 'smooth',
			});
		} else {
			root.scrollTo({ top: 0, behavior: 'smooth' });
		}

		return true;
	}
	// Создаем walker который включает текст внутри <mark> элементов
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
		acceptNode(node) {
			// Принимаем все текстовые узлы включая те что внутри <mark>
			if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
			return NodeFilter.FILTER_ACCEPT;
		},
	});

	let bestMatch: { node: Text; index: number } | null = null;

	while (walker.nextNode()) {
		const node = walker.currentNode as Text;
		const content = node.textContent ?? '';

		// 1️⃣ Точное совпадение anchor_text
		const idx = content.indexOf(anchor.anchor_text);
		if (idx !== -1) {
			bestMatch = { node, index: idx };
			break;
		}

		// 2️⃣ Контекстное совпадение по before/after
		if (anchor.before && anchor.after) {
			const beforeIdx = content.indexOf(anchor.before);
			const afterIdx = content.indexOf(anchor.after);
			if (beforeIdx !== -1 && afterIdx !== -1) {
				bestMatch = {
					node,
					index: beforeIdx,
				};
				// Не break, продолжаем искать лучшее совпадение
			}
		}
		
		// 3️⃣ Фолбэк: частичное совпадение anchor_text (если текст разбит <mark>)
		if (!bestMatch && anchor.anchor_text) {
			// Пробуем найти часть anchor_text (первые 40 символов)
			const shortAnchor = anchor.anchor_text.slice(0, Math.min(40, anchor.anchor_text.length));
			const shortIdx = content.indexOf(shortAnchor);
			if (shortIdx !== -1) {
				bestMatch = { node, index: shortIdx };
			}
		}
	}

	if (!bestMatch) {
		console.warn('Anchor not found:', anchor.anchor_text);
		root.scrollTo({ top: 0 });
		return false;
	}

	// Создаем range для определения позиции скролла
	const range = document.createRange();
	try {
		const matchLength = Math.min(anchor.anchor_text.length, bestMatch.node.length - bestMatch.index);
		range.setStart(bestMatch.node, bestMatch.index);
		range.setEnd(bestMatch.node, Math.min(bestMatch.index + matchLength, bestMatch.node.length));
	} catch (e) {
		console.error('Failed to set range:', e);
		root.scrollTo({ top: 0 });
		return false;
	}

	const rect = range.getBoundingClientRect();
	const targetScroll = rect.top + root.scrollTop - 120;

	root.scrollTo({
		top: targetScroll,
		behavior: 'smooth',
	});

	return true;
}

