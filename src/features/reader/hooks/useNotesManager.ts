/**
 * Хук управления заметками читалки.
 * Вынесен из BookRead.tsx.
 */

import { createSignal, createUniqueId, onCleanup } from 'solid-js';
import { addNote, updateNote as updateNoteApi } from '../../../shared/api/notes';
import { toast } from '../../../shared/stores/toastStore';
import { isHexLight } from '../../../shared/utils/color';
import {
  findTextOffset,
  getRangeStartSnippet,
  getTextOffsetsInRoot,
  buildTextIndex,
} from '../utils/textSelection';
import {
  wrapRangeWithMarks,
  unwrapMarks,
  bindNoteMarks,
  wrapOffsetsWithMarks,
} from '../utils/noteHighlight';
import type { Note } from '../../../shared/types/note';
import { NoteEditorState, defaultNoteEditorState } from '../types/readerTypes';

export interface UseNotesManagerReturn {
  nodeEditing: () => NoteEditorState;
  setNodeEditing: (v: NoteEditorState | ((prev: NoteEditorState) => NoteEditorState)) => void;
  noteEditorEl: () => HTMLDivElement | null;
  setNoteEditorEl: (el: HTMLDivElement | null) => void;
  handleAddNote: (options: {
    contentEl: HTMLDivElement;
    chapterId: string;
    position?: { x: number; y: number };
  }) => void;
  createNote: (options: {
    bookPath: string;
  }) => Promise<void>;
  closeNoteEditor: (reason: 'outside' | 'cancel' | 'saved') => void;
  updateNotes: (notes: Note[], contentEl: HTMLDivElement) => void;
}

export function useNotesManager(): UseNotesManagerReturn {
  const [nodeEditing, setNodeEditing] = createSignal<NoteEditorState>({
    ...defaultNoteEditorState,
  });
  const [noteEditorEl, setNoteEditorEl] = createSignal<HTMLDivElement | null>(null);
  let notesUpdateRaf: number | null = null;

  function closeNoteEditor(reason: 'outside' | 'cancel' | 'saved') {
    const current = nodeEditing();
    if (!current.visible) return;

    if (reason !== 'saved' && current.id) {
      unwrapMarks(current.id);
    }

    window.getSelection()?.removeAllRanges();

    setNodeEditing({
      ...defaultNoteEditorState,
    });
  }

  function handleAddNote(options: { contentEl: HTMLDivElement; chapterId: string, position?: { x: number; y: number } }) {
    const { contentEl, chapterId } = options;
    const selection = window.getSelection();
    if (!selection) {
      toast.error('Вы ничего не выделили');
      return;
    }
    const selectedText = selection.toString();
    if (!selectedText) {
      toast.error('Вы ничего не выделили');
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const textOffset = findTextOffset(contentEl, selectedText) ?? 0;
    const previewSnippet = getRangeStartSnippet(range, 120);
    let preview = previewSnippet || selectedText.slice(0, 120);
    const noteId = createUniqueId();
    const color = '#fb7100';

    const offsets = contentEl ? getTextOffsetsInRoot(contentEl, range) : null;
    const startOffset = offsets?.startOffset ?? textOffset;
    const endOffset = offsets?.endOffset ?? textOffset + selectedText.length;

    if (contentEl) {
      const { text } = buildTextIndex(contentEl);
      if (text.length) {
        const safeStart = Math.max(0, Math.floor(startOffset));
        preview = text.slice(safeStart, Math.min(text.length, safeStart + 120));
      }
    }

    wrapRangeWithMarks(range, noteId, color);
    selection.removeAllRanges();

    setNodeEditing({
			id: noteId,
			text: '',
			offset: textOffset,
			preview,
			visible: true,
			color,
			position: {
				x: options.position?.x ?? rect.left,
				y: options.position?.y ?? rect.top + 50,
			},
			range: {
				end: { chapter_id: chapterId, offset: endOffset },
				start: { chapter_id: chapterId, offset: startOffset },
			},
		});
  }

  async function createNote(options: { bookPath: string }) {
    const { bookPath } = options;
    const current = nodeEditing();
    if (!current.id) return;

    try {
      const note = await addNote(
        bookPath,
        current.range,
        current.text,
        current.preview,
        true,
        current.color,
      );

      // Обновить data-note на реальный ID
      document.querySelectorAll(`mark[data-note="${current.id}"]`).forEach(el => {
        (el as HTMLElement).dataset['note'] = note.id;
      });

      closeNoteEditor('saved');
      toast.success('Заметка добавлена');
    } catch (err) {
      console.error('Failed to add note:', err);
      toast.error('Не удалось добавить заметку');
    }
  }

  /**
   * Применить заметки к DOM (обернуть текст в <mark>).
   */
  function updateNotes(notes: Note[], contentEl: HTMLDivElement) {
    if (!contentEl) return;

    notes.forEach(note => {
      // Проверяем, не обернута ли уже заметка
      const existingMarks = contentEl.querySelectorAll(`mark[data-note="${note.id}"]`);
      if (existingMarks.length > 0) {
        // Уже существует, просто привязываем обработчик
        bindNoteMarks(note, contentEl, _onMarkClick);
        return;
      }

      const startOffset = note.range.start.offset ?? null;
      const endOffset = note.range.end.offset ?? null;

      // Попробовать по оффсетам
      if (startOffset !== null && endOffset !== null && endOffset > startOffset) {
        const total = buildTextIndex(contentEl).total;
        const safeStart = Math.max(0, Math.floor(startOffset));
        const safeEnd = Math.min(total, Math.floor(endOffset));
        if (total > 0 && safeEnd > safeStart) {
          const didWrap_ = wrapOffsetsWithMarks(
            contentEl, safeStart, safeEnd, note.id, note.highlight_color ?? '#fb7100',
          );
          if (didWrap_) {
            bindNoteMarks(note, contentEl, _onMarkClick);
            return;
          }
        }
      }

      // Попробовать по preview
      const { text: rootText } = buildTextIndex(contentEl);
      if (note.preview) {
        const idx = rootText.indexOf(note.preview);
        if (idx !== -1) {
          const didWrap_ = wrapOffsetsWithMarks(
            contentEl, idx, idx + note.preview.length, note.id, note.highlight_color ?? '#fb7100',
          );
          if (didWrap_) {
            // Мигрировать оффсеты
            if (
              note.range.start.offset !== idx ||
              note.range.end.offset !== idx + note.preview.length
            ) {
              updateNoteApi(
                note.id,
                {
                  start: { ...note.range.start, offset: idx },
                  end: { ...note.range.end, offset: idx + note.preview.length },
                },
                note.text,
                true,
                note.highlight_color ?? undefined,
              );
            }

            bindNoteMarks(note, contentEl, _onMarkClick);
            return;
          }
        }
      }

      // Fallback: поиск по текстовым узлам (включая те что внутри <mark>)
      const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.textContent) return NodeFilter.FILTER_REJECT;
          // Теперь включаем текст внутри <mark> для поиска
          return NodeFilter.FILTER_ACCEPT;
        },
      });

      const targets: Text[] = [];
      while (walker.nextNode()) {
        const textContent = walker.currentNode.textContent!;
        // Проверяем что текст ещё не обёрнут
        const parent = walker.currentNode.parentElement;
        if (parent?.tagName === 'MARK' && parent.dataset.note === note.id) {
          continue; // Уже обёрнуто
        }
        if (textContent.includes(note.preview)) {
          targets.push(walker.currentNode as Text);
        }
      }

      targets.forEach(textNode => {
        let index;
        while ((index = textNode.textContent!.indexOf(note.preview)) !== -1) {
          const after = textNode.splitText(index);
          after.splitText(note.preview.length);

          const mark = document.createElement('mark');
          mark.textContent = note.preview;
          mark.dataset.note = note.id;
          mark.style.backgroundColor = note.highlight_color ?? '#fb7100';
          mark.style.borderRadius = '4px';
          mark.style.color = isHexLight(note.highlight_color ?? '#fb7100') ? '#000' : '#fff';
          mark.style.zIndex = '-1'
          after.parentNode!.replaceChild(mark, after);
        }
      });

      bindNoteMarks(note, contentEl, _onMarkClick);
    });
  }

  /**
   * Popup заметки при клике на <mark>.
   * Эта функция создаёт DOM-элемент popup прямо на <mark>.
   */
  function _onMarkClick(mark: HTMLElement, note: Note) {
    const existing = mark.querySelector('[data-popup]');
    if (existing) {
      existing.remove();
      return;
    }

    const popup = document.createElement('div');
    popup.dataset.popup = 'true';
    popup.className = `
      absolute z-50
      bg-(--background)/80 backdrop-blur-lg
      rounded-xl
      -left-[2px] top-8
      border border-[var(--border)]
      pr-4
    `;

    popup.innerHTML = `
      <div class="popup-note flex gap-2 p-2 items-start">
        <label class="input-label inline-flex cursor-pointer">
          <input type="color" class="sr-only" value="${note.highlight_color ?? '#fb7100'}" />
          <span class="w-6 h-6 rounded-full border shadow"></span>
        </label>
        <div contenteditable class="text-(--foreground) text-left">${note.text.trim()}</div>
      </div>
    `;

    mark.appendChild(popup);

    const rect = mark.getBoundingClientRect();

    const input = popup.querySelector('input[type=color]') as HTMLInputElement;
    const preview = input.nextElementSibling as HTMLElement;
    preview.style.backgroundColor = input.value;

    input.addEventListener('input', () => {
      preview.style.backgroundColor = input.value;
      document.querySelectorAll(`mark[data-note="${note.id}"]`).forEach(el => {
        const m = el as HTMLElement;
        m.style.backgroundColor = input.value;
        m.style.boxShadow = `0 0 0 3px ${input.value}`;
        m.style.color = isHexLight(input.value) ? '#000' : '#fff';
      });
      updateNoteApi(note.id, note.range, note.text, true, input.value);
    });

    const text = popup.querySelector('div') as HTMLDivElement;
    text.addEventListener('input', () => {
      updateNoteApi(note.id, note.range, text.textContent ?? '', true, input.value);
    });

    popup.addEventListener('click', e => e.stopPropagation());

    const onOutsideClick = () => {
      popup.remove();
      document.removeEventListener('click', onOutsideClick);
    };
    document.addEventListener('click', onOutsideClick);
  }

  onCleanup(() => {
    if (notesUpdateRaf) cancelAnimationFrame(notesUpdateRaf);
  });

  return {
    nodeEditing,
    setNodeEditing,
    noteEditorEl,
    setNoteEditorEl,
    handleAddNote,
    createNote,
    closeNoteEditor,
    updateNotes,
  };
}
