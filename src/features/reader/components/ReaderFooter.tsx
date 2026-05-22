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
        shrink-0 h-10 fixed bottom-1 right-4 pl-5.5 w-full flex items-center justify-between gap-4
        transition-all duration-200 ease-in hover:opcaity-100! hover:pointer-events-auto
        ${props.showControls ? '' : 'opacity-0'}
      `}
		>
			<GlassButton
				size='sm'
				variant='ghost'
				class='flex items-center gap-2 border-[var(--border)]  rounded-lg px-2 pr-4 backdrop-blur-md! bg-(--background)/40!'
				disabled={props.disabledPrev}
				onClick={props.onPrevChapter}
			>
				<Icon name='chevronLeft' size={16} />
				<span class='hidden sm:inline ml-1'>Назад</span>
			</GlassButton>

			<div class='flex-1 max-w-sm flex items-center gap-2 border-[var(--border)] p-2 rounded-lg  backdrop-blur-md bg-(--background)/40'>
				<span class='text-xs text-[var(--foreground-muted)] w-auto text-right'>
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
				class='flex items-center gap-2 border-[var(--border)]  rounded-lg p-2 backdrop-blur-md bg-(--background)/40'
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
