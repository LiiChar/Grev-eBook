/**
 * Верхняя панель читалки (toolbar).
 * Кнопки: назад, оглавление, закладка, заметка, настройки, полный экран.
 */

import { Show } from 'solid-js';
import { GlassButton } from '../../../shared/ui/GlassButton';
import { Icon } from '../../../shared/ui/Icon';
import { setReaderMode, settings } from '@/shared/stores/settingsStore';

export interface ReaderToolbarProps {
  bookTitle: string;
  hasMultipleChapters: boolean;
  showControls: boolean;
  isFullscreen: boolean;
  onNavigateBack: () => void;
  onToggleToc: () => void;
  onToggleSettings: () => void;
  onToggleFullscreen: () => void;
}

export function ReaderToolbar(props: ReaderToolbarProps) {
  return (
		<header
			data-tauri-drag-region
			class={`
        shrink-0 h-11 flex items-center justify-between
        transition-all duration-200 ease-in fixed top-1 right-4 pl-5.5 w-full z-50
        ${props.showControls ? '' : '  opacity-0 pointer-events-none'}
      `}
		>
			{/* Left */}
			<div class='flex items-center gap-2 border-[var(--border)]  rounded-lg px-2 pr-4 backdrop-blur-md bg-(--background)/40'>
				<GlassButton size='icon' variant='ghost' onClick={props.onNavigateBack}>
					<Icon name='chevronLeft' size={18} />
				</GlassButton>
				<div class='hidden sm:block'>{props.bookTitle}</div>
			</div>

			{/* Right */}
			<div class='flex items-center gap-0 border-[var(--border)]  rounded-lg overflow-hidden  backdrop-blur-md bg-(--background)/40'>
				<Show when={props.hasMultipleChapters}>
					<GlassButton
						size='icon'
						variant='ghost'
						onClick={props.onToggleToc}
						title='Оглавление (T)'
					>
						<Icon name='listBullet' size={18} />
					</GlassButton>
				</Show>

				<GlassButton
					size='icon'
					variant='ghost'
					onClick={props.onToggleSettings}
					title='Настройки'
				>
					<Icon name='adjustments' size={18} />
				</GlassButton>
				<GlassButton
					size='icon'
					variant='ghost'
					onClick={props.onToggleFullscreen}
					title='Полный экран (F)'
				>
					<Icon
						name={props.isFullscreen ? 'arrowsCollapse' : 'arrowsExpand'}
						size={18}
					/>
				</GlassButton>
			</div>
		</header>
	);
}
