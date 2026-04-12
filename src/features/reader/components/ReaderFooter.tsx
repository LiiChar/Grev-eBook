/**
 * Нижняя панель навигации читалки (footer).
 * Отображается только в режиме «Главы».
 */

import { GlassButton } from '../../../shared/ui/GlassButton';
import { Icon } from '../../../shared/ui/Icon';

export interface ReaderFooterProps {
  currentIndex: number;
  totalChapters: number;
  progress: number;
  showControls: boolean;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  disabledPrev: boolean;
  disabledNext: boolean;
}

export function ReaderFooter(props: ReaderFooterProps) {
  return (
    <footer
      class={`
        shrink-0 h-12 px-4 flex items-center justify-between gap-4
        border-t border-[var(--border)] bg-[var(--surface)]
        transition-all duration-200 ease-in
        ${props.showControls ? '' : 'h-0 opacity-0 pointer-events-none'}
      `}
    >
      <GlassButton
        size='sm'
        variant='ghost'
        disabled={props.disabledPrev}
        onClick={props.onPrevChapter}
      >
        <Icon name='chevronLeft' size={16} />
        <span class='hidden sm:inline ml-1'>Назад</span>
      </GlassButton>

      <div class='flex-1 max-w-sm flex items-center gap-2'>
        <span class='text-xs text-[var(--foreground-muted)] w-6 text-right'>
          {props.currentIndex + 1}
        </span>
        <div class='flex-1 h-1 bg-[var(--border)] rounded-full overflow-hidden'>
          <div
            class='h-full bg-(--primary) rounded-full transition-all duration-300'
            style={{ width: `${props.progress}%` }}
          />
        </div>
        <span class='text-xs text-(--foreground-muted) w-6'>
          {props.totalChapters}
        </span>
      </div>

      <GlassButton
        size='sm'
        variant='ghost'
        disabled={props.disabledNext}
        onClick={props.onNextChapter}
      >
        <span class='hidden sm:inline mr-1'>Далее</span>
        <Icon name='chevronRight' size={16} />
      </GlassButton>
    </footer>
  );
}
