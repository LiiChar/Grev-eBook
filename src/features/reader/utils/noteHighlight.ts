/**
 * Утилиты для обёртки текстовых узлов в <mark> для highlight заметок.
 * Вынесены из BookRead.tsx.
 */

import { isHexLight } from '../../../shared/utils/color';
import { buildTextIndex } from './textSelection';
import type { Note } from '../../../shared/types/note';

/**
 * Создать элемент <mark> для заметки.
 */
function createMarkElement(noteId: string, color: string): HTMLElement {
  const mark = document.createElement('mark');
  mark.style.backgroundColor = color;
  mark.style.borderRadius = '4px';
  mark.style.color = isHexLight(color) ? '#000' : '#fff';
  mark.dataset['note'] = noteId;
  return mark;
}

/**
 * Обернуть диапазон в <mark> (один текстовый узел или множество).
 */
export function wrapRangeWithMarks(
  range: Range,
  noteId: string,
  color: string,
): void {
  if (range.commonAncestorContainer.nodeType === Node.TEXT_NODE) {
    wrapSingleTextNode(range.commonAncestorContainer as Text, range.startOffset, range.endOffset, noteId, color);
    return;
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

  const nodes: Text[] = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Text);
  }

  nodes.forEach(node => {
    const text = node.textContent ?? '';
    const start = node === range.startContainer ? range.startOffset : 0;
    const end = node === range.endContainer ? range.endOffset : text.length;
    if (start >= end) return;
    wrapSingleTextNode(node, start, end, noteId, color);
  });
}

/**
 * Обернуть часть текстового узла в <mark>.
 */
function wrapSingleTextNode(
  node: Text,
  start: number,
  end: number,
  noteId: string,
  color: string,
): void {
  const text = node.textContent ?? '';
  if (start >= end) return;

  const mark = createMarkElement(noteId, color);

  if (start === 0 && end === text.length) {
    mark.textContent = text;
    node.parentNode!.replaceChild(mark, node);
    return;
  }

  const middle = node.splitText(start);
  const after = middle.splitText(end - start);
  mark.textContent = middle.textContent ?? '';
  middle.parentNode!.replaceChild(mark, middle);

  if (!after.textContent?.length && after.parentNode) {
    after.parentNode.removeChild(after);
  }
  if (!node.textContent?.length && node.parentNode) {
    node.parentNode.removeChild(node);
  }
}

/**
 * Обернуть текстовые оффсеты в <mark> по индексу buildTextIndex.
 * Возвращает true если хоть один узел был обёрнут.
 */
export function wrapOffsetsWithMarks(
  root: HTMLElement,
  start: number,
  end: number,
  noteId: string,
  color: string,
): boolean {
  if (end <= start) return false;

  const { segments } = buildTextIndex(root);
  const targets: { node: Text; localStart: number; localEnd: number }[] = [];

  segments.forEach(seg => {
    const selStart = Math.max(start, seg.start);
    const selEnd = Math.min(end, seg.end);
    if (selStart < selEnd) {
      targets.push({
        node: seg.node,
        localStart: selStart - seg.start,
        localEnd: selEnd - seg.start,
      });
    }
  });

  targets.forEach(({ node, localStart, localEnd }) => {
    wrapSingleTextNode(node, localStart, localEnd, noteId, color);
  });

  return targets.length > 0;
}

/**
 * Развернуть все <mark> для заметки обратно в текстовые узлы.
 */
export function unwrapMarks(noteId: string): void {
  document.querySelectorAll(`mark[data-note="${noteId}"]`).forEach(mark => {
    const parent = mark.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(mark.textContent ?? ''), mark);
    parent.normalize();
  });
}

/**
 * Привязать обработчик клика к <mark> элементам заметки.
 */
export function bindNoteMarks(
  note: Note,
  root: HTMLElement,
  onMarkClick: (mark: HTMLElement, note: Note) => void,
): void {
  root.querySelectorAll(`mark[data-note="${note.id}"]`).forEach(el => {
    const mark = el as HTMLElement;
    mark.style.position = 'relative';
    mark.style.cursor = 'pointer';
    mark.style.zIndex = '-1';

    if (mark.dataset.popupBound === '1') return;
    mark.dataset.popupBound = '1';

    mark.onclick = e => {
      e.stopPropagation();
      onMarkClick(mark, note);
    };
  });
}

/**
 * Нормализация пробелов в тексте.
 */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
