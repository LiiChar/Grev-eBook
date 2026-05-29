import { Range } from '@/shared/ui/Range';
import { GlassButton } from '../../../shared/ui/GlassButton';
import { Icon } from '../../../shared/ui/Icon';
import { settings } from '@/shared/stores/settingsStore';
import { Show } from 'solid-js';

export interface ReaderFooterProps {
  currentIndex: number;
  totalChapters: number;
	onSelect: (index: number) => void;
}

export function ReaderFooter(props: ReaderFooterProps) {
	return (
		<footer
			class={`
        shrink-0 h-10 fixed bottom-1 right-4 pl-5.5 w-full flex items-center justify-between gap-4
        transition-all duration-200 ease-in hover:opcaity-100! hover:pointer-events-auto
				${settings.reader.mode !== 'chapters' ? 'justify-center' : ''}
      `}
		>
			<Show when={settings.reader.mode === 'chapters'}>
				<GlassButton
					size='sm'
					variant='ghost'
					class='flex items-center gap-2 rounded-lg! p-2 glass reader-control'
					disabled={props.currentIndex === 0}
					onClick={props.onSelect.bind(null, props.currentIndex - 1)}
				>
					<Icon name='chevronLeft' size={16} />
					<span class='hidden sm:inline ml-1'>Назад</span>
				</GlassButton>
			</Show>
			<div class='flex-1 max-w-sm flex items-center gap-2 glass border-border p-2 rounded-lg  backdrop-blur-md bg-background/40 reader-control'>
				<div class='text-xs text-muted-foreground w-auto min-w-6 text-center'>
					{props.currentIndex + 1}
				</div>
				<Range
					value={props.currentIndex}
					onInput={v => {
						props.onSelect(v);
					}}
					min={0}
					max={props.totalChapters - 1}
					step={1}
					class='w-full'
				/>
				<div class='text-xs text-muted-foreground w-auto min-w-6 text-center'>
					{props.totalChapters}
				</div>
			</div>
			<Show when={settings.reader.mode === 'chapters'}>
				<GlassButton
					class='flex items-center gap-2 rounded-lg! p-2 glass reader-control'
					size='sm'
					variant='ghost'
					disabled={props.currentIndex === props.totalChapters - 1}
					onClick={props.onSelect.bind(null, props.currentIndex + 1)}
				>
					<span class='hidden sm:inline mr-1'>Далее</span>
					<Icon name='chevronRight' size={16} />
				</GlassButton>
			</Show>
		</footer>
	);
}
