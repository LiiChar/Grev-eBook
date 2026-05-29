import { createSignal, onCleanup, onMount, Show } from 'solid-js';
import { GlassButton } from '../../../shared/ui/GlassButton';
import { Icon } from '../../../shared/ui/Icon';
import { setReaderMode, settings } from '@/shared/stores/settingsStore';
import { useTTS } from '@/shared/hooks/useTTS';
import { Play, Pause, Scroll } from 'lucide-solid';
import { useAutoScroll } from '@/shared/hooks/useAutoScroll';
import { reader, setReader } from '@/shared/stores/readerStore';
import { scrollToTop } from '@/shared/utils/scroll';
import { getReadingPosition } from '@/shared/api/reader';
import { stripHtml } from '@/shared/utils/html';
import { Book } from '@/shared/types/book';

export interface ReaderToolbarProps {
	book: Book,
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
		{ speed: 34, autoscroll: reader.autoscroll,
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

	const [percent, setPercent] = createSignal(0);


	let interval: number;
	onMount(() => {
		if (!props.book.chapters?.length) return;

		const pos = props.book.position ?? null;
		if (!pos?.anchor_text) return;

		const chaptersText = props.book.chapters.map(c => stripHtml(c.html));
		const fullText = chaptersText.join('\n');
		const anchor = pos.anchor_text.trim();
		const index = fullText.indexOf(anchor);
		if (index < 0) return;
		const value = Math.round((index / fullText.length) * 100);
		setPercent(Math.min(Math.max(value, 1), 100));

		interval = setInterval(() => {
			setPercent(p => Math.min(Math.max(p + 1, 1), 100));
		}, 100);
	});

	onCleanup(() => clearInterval(interval));

	

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
				<GlassButton
					class='rounded-lg! px-0! reader-control sm:aspect-auto aspect-square '
					onClick={props.onNavigateBack}
				>
					<div class='flex items-center gap-2  rounded-lg p-0 sm:px-2 sm:pr-4 sm:px-2 '>
						<Icon name='chevronLeft' size={18} class='-ml-0.5' />
						<div class='hidden sm:block'>{props.book.meta.title}</div>
					</div>
				</GlassButton>

				{/* Right */}
				<div class='flex items-center gap-0 border-border glass rounded-lg overflow-hidden  backdrop-blur-md bg-background/40 relative reader-control'>
					<div
						class='absolute -z-1 top-0 left-0 h-full bg-background/60 transition'
						style={{ width: percent() + '%' }}
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
							<Scroll class='stroke-primary' size={14} />
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
					{/* <GlassButton
						size='icon'
						variant='ghost'
						onClick={props.onToggleFullscreen}
						title='Полный экран (F)'
					>
						<Icon
							name={props.isFullscreen ? 'arrowsCollapse' : 'arrowsExpand'}
							size={18}
						/>
					</GlassButton> */}
				</div>
			</header>
		);
}
