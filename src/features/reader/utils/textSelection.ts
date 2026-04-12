/**
 * Утилиты для выделения текста и получения текстовой информации из DOM.
 * Вынесены из BookRead.tsx для переиспользования и тестируемости.
 */

/**
 * Получить текстовый сниппет с начала Range (до maxLen символов).
 */
export function getRangeStartSnippet(range: Range, maxLen: number): string {
  if (range.startContainer.nodeType === Node.TEXT_NODE) {
    const text = (range.startContainer as Text).textContent ?? '';
    const start = range.startOffset;
    return text.slice(start, start + maxLen);
  }

  const walker = document.createTreeWalker(
    range.commonAncestorContainer,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
        if (node.parentElement?.tagName === 'MARK')
          return NodeFilter.FILTER_REJECT;
        return range.intersectsNode(node)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    },
  );

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const text = node.textContent ?? '';
    const start = node === range.startContainer ? range.startOffset : 0;
    if (start >= text.length) continue;
    return text.slice(start, start + maxLen);
  }

  return '';
}

/**
 * Найти суммарный текстовой оффет текста в root.
 */
export function findTextOffset(root: Node, text: string): number {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let offset = 0;

  while (walker.nextNode()) {
    const node = walker.currentNode;
    let start = 0;

    while (true) {
      const idx = (node.textContent ?? '').indexOf(text, start);
      if (idx === -1) {
        offset += node.textContent?.length ?? 0;
        return offset;
      } else {
        offset += idx;
      }
      start = idx + text.length;
    }
  }

  return offset;
}

/**
 * Построить текстовый индекс дерева элементов (исключая <mark>).
 * Возвращает полный текст, сегменты и общую длину.
 */
export function buildTextIndex(root: HTMLElement): {
  text: string;
  segments: { node: Text; start: number; end: number }[];
  total: number;
} {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.parentElement?.tagName === 'MARK')
        return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let offset = 0;
  const segments: { node: Text; start: number; end: number }[] = [];
  let text = '';

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const chunk = node.textContent ?? '';
    const start = offset;
    const end = start + chunk.length;
    segments.push({ node, start, end });
    text += chunk;
    offset = end;
  }

  return { text, segments, total: offset };
}

/**
 * Получить текстовые оффсеты Range относительно root.
 */
export function getTextOffsetsInRoot(
  root: HTMLElement,
  range: Range,
): { startOffset: number; endOffset: number; total: number } | null {
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return null;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.parentElement?.tagName === 'MARK')
        return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let offset = 0;
  let startOffset: number | null = null;
  let endOffset: number | null = null;

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const len = node.textContent?.length ?? 0;

    if (node === range.startContainer) {
      startOffset = offset + range.startOffset;
    }
    if (node === range.endContainer) {
      endOffset = offset + range.endOffset;
    }

    offset += len;
  }

  if (startOffset === null || endOffset === null) return null;
  return { startOffset, endOffset, total: offset };
}

/**
 * Получить корневой элемент главы для указанного узла.
 */
export function getChapterRootFromNode(
  node: Node | null,
  fallback: HTMLElement | null,
): HTMLElement | null {
  if (!node) return fallback ?? null;
  const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  if (!el) return fallback;
  return (el.closest('.chapter') as HTMLElement) ?? fallback;
}

/**
 * Найти все вхождения текста и выделить их через Selection.
 */
export function findAllAndSelect(root: Node, text: string): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const sel = window.getSelection();
  if (!sel) return;

  sel.removeAllRanges();

  while (walker.nextNode()) {
    const node = walker.currentNode;
    let start = 0;

    while (true) {
      const idx = (node.textContent ?? '').indexOf(text, start);
      if (idx === -1) break;

      const range = document.createRange();
      range.setStart(node, idx);
      range.setEnd(node, idx + text.length);
      sel.addRange(range);

      start = idx + text.length;
    }
  }
}
