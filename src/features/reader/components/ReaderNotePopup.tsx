/**
 * Popup-редактор заметки (появляется при выделении текста).
 */

import { GlassButton } from '../../../shared/ui/GlassButton';
import { isHexLight } from '../../../shared/utils/color';
import type { NoteEditorState } from '../types/readerTypes';

export interface ReaderNotePopupProps {
  nodeEditing: NoteEditorState;
  onColorChange: (color: string) => void;
  onTextChange: (text: string) => void;
  onCancel: () => void;
  onSave: () => void;
  onUpdateMarks: (noteId: string, color: string) => void;
  textareaRef?: (el: HTMLTextAreaElement | undefined) => void;
}

export function ReaderNotePopup(props: ReaderNotePopupProps) {
  return (
		<div
			class='fixed z-50 min-w-60 rounded-lg border border-border
       bg-background/40 backdrop-blur-lg shadow-xl p-2 flex flex-col gap-2 -translate-x-full'
			style={{
				top: `${props.nodeEditing.position.y}px`,
				left: `${props.nodeEditing.position.x}px`,
			}}
			onMouseDown={e => e.stopPropagation()}
		>
			<div class='flex gap-3 items-start'>
				{/* Color picker */}
				<label class='cursor-pointer aspect-square h-5 w-5 absolute -left-6 top-2'>
					<input
						type='color'
						class='sr-only p-0!'
						value={props.nodeEditing.color}
						onInput={e => {
							const color = e.currentTarget.value;

							props.onUpdateMarks(props.nodeEditing.id, color);

							document
								.querySelectorAll(`mark[data-note="${props.nodeEditing.id}"]`)
								.forEach(el => {
									const elh = el as HTMLElement;
									elh.style.backgroundColor = color;
									elh.style.color = isHexLight(color) ? '#000' : '#fff';
								});

							props.onColorChange(color);
						}}
					/>
					<div
						class='w-full h-full rounded-full border shadow'
						style={{ background: props.nodeEditing.color }}
					/>
				</label>

				{/* Editable text */}
				<textarea
					ref={props.textareaRef}
					class='flex-1 text-sm text-foreground bg-secondary
             outline-none rounded px-2 py-1 min-h-[64px] resize-none border border-border'
					placeholder='Добавьте текст заметки...'
					value={props.nodeEditing.text}
					onInput={e => props.onTextChange(e.currentTarget.value ?? '')}
				/>
			</div>

			<div class='flex items-center gap-2 justify-end'>
				<GlassButton variant='ghost' onClick={props.onCancel}>
					Отмена
				</GlassButton>
				<GlassButton onClick={props.onSave}>Сохранить</GlassButton>
			</div>
		</div>
	);
}
