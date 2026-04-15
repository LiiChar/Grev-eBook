import { Show } from 'solid-js';
import { GlassButton } from '../../../shared/ui/GlassButton';
import { Icon } from '../../../shared/ui/Icon';
import { setReaderMode, settings } from '@/shared/stores/settingsStore';
import { useTTS } from '@/shared/hooks/useTTS';
import { Play, Pause, Scroll } from 'lucide-solid';
import { useAutoScroll } from '@/shared/hooks/useAutoScroll';
import { reader, setReader } from '@/shared/stores/readerStore';
import { scrollToTop } from '@/shared/utils/scroll';

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

	const {play, playing, pause, progress} = useTTS({target: '.reader', autoplay: reader.autoplay});
	const { startScroll, stopScroll, scrolling } = useAutoScroll(
		'.reader-wrapper',
		{ speed: 40, autoscroll: reader.autoscroll,
			onEndScroll() {
				console.log(
					settings.reader.mode,
					reader.currentIndex, 
					reader.chapters.length - 1,
				);
				
				if (settings.reader.mode == 'chapters' && reader.currentIndex < reader.chapters.length - 1) {
					setReader('currentIndex', reader.currentIndex + 1);
					scrollToTop('.reader-wrapper');
					startScroll()
				}
			},
		 },
	);

  return (
		<header
			data-tauri-drag-region
			class={`
        shrink-0 h-11 flex items-center justify-between
        transition-all duration-200 ease-in fixed top-1 right-4 pl-5.5 w-full z-50 hover:opacity-100
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
			<div class='flex items-center gap-0 border-[var(--border)]  rounded-lg overflow-hidden  backdrop-blur-md bg-(--background)/40 relative'>
				<div
					class='absolute top-0 left-0 h-full bg-(--background)/80 transition'
					style={{ width: progress() * 100 + '%' }}
				/>
				<div class='relative'>
					<GlassButton
						size='icon'
						variant='ghost'
						onClick={() => (playing() ? pause() : play())}
						title='Текст в речь'
					>
						{playing() ? <Pause size={14} /> : <Play size={14} />}
					</GlassButton>
				</div>

				<GlassButton
					size='icon'
					variant='ghost'
					onClick={() => (scrolling() ? stopScroll() : startScroll())}
					title='Текст в речь'
				>
					{scrolling() ? (
						<Scroll class='stroke-(--primary)' size={14} />
					) : (
						<Scroll size={14} />
					)}
				</GlassButton>

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
