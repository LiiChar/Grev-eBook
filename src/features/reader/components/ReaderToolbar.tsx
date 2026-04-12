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
  onAddBookmark: () => void;
  onAddNote: () => void;
  onToggleSettings: () => void;
  onToggleFullscreen: () => void;
}

export function ReaderToolbar(props: ReaderToolbarProps) {
  return (
		<header
			data-tauri-drag-region
			class={`
        shrink-0 h-11 flex items-center justify-between
        transition-all duration-200 ease-in fixed! top-1  left-0 px-1 pr-3.5 w-full z-50
        ${props.showControls ? '' : ' h-0! opacity-0 pointer-events-none'}
      `}
		>
			{/* Left */}
			<div class='flex items-center gap-2 border-[var(--border)]  rounded-lg px-2 pr-4 backdrop-blur-md'>
				<GlassButton size='icon' variant='ghost' onClick={props.onNavigateBack}>
					<Icon name='chevronLeft' size={18} />
				</GlassButton>
				<div class='hidden sm:block'>
					<p class='text-sm font-medium truncate max-w-[200px]'>
						{props.bookTitle}
					</p>
				</div>
			</div>


			{/* Right */}
			<div class='flex items-center gap-0 border-[var(--border)]  rounded-lg overflow-hidden  backdrop-blur-md'>
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
					onClick={props.onAddBookmark}
					title='Закладка (B)'
				>
					<Icon name='bookmark' size={18} />
				</GlassButton>
				<GlassButton
					size='icon'
					variant='ghost'
					onClick={props.onAddNote}
					title='Заметки (N)'
				>
					<Icon name='note' size={18} />
				</GlassButton>
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
