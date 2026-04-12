import { TextRange } from '../../../shared/types/note';

export interface NoteEditorState {
  id: string;
  text: string;
  visible: boolean;
  preview: string;
  color: string;
  position: { x: number; y: number };
  range: TextRange;
  offset: number;
}

export const defaultNoteEditorState: NoteEditorState = {
  id: '',
  text: '',
  visible: false,
  preview: '',
  color: '',
  position: { x: 0, y: 0 },
  range: {
    end: { chapter_id: '', offset: 0 },
    start: { chapter_id: '', offset: 0 },
  },
  offset: 0,
};
