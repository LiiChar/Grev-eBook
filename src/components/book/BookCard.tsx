import { Accessor, createMemo, createSignal, JSX, onMount, onCleanup, Show, splitProps } from "solid-js";
import { Book as BookType } from "../../shared/types/book";
import { GlassPanel } from "../../shared/ui/GlassPanel";
import { Icon } from "../../shared/ui/Icon";
import { getReadingPosition } from "../../shared/api/reader";
import { stripHtml } from "../../shared/utils/html";
import { getFileExtension } from "../../shared/utils/file";

type BookCardProps = {
	book: BookType;
	viewMode: Accessor<'grid' | 'list'>;
	index: number;
	onClick: () => void;
} & JSX.HTMLAttributes<HTMLDivElement>;

export function BookCard(props: BookCardProps) {
	const [local, rest] = splitProps(props, [
		'viewMode',
		'book',
		'index',
		'onClick',
	]);

	return (
		<Show
			when={local.viewMode() === 'list'}
			fallback={
				<BookCardGrid
					book={local.book}
					index={local.index}
					onClick={local.onClick}
					viewMode={local.viewMode}
					{...rest}
				/>
			}
		>
			<BookCardList
				book={local.book}
				index={local.index}
				onClick={local.onClick}
				viewMode={local.viewMode}
				{...rest}
			/>
		</Show>
	);
}

export const BookCardGrid = (props: BookCardProps) => {
	const coverUrl = createMemo(() => {
		const cover = props.book.meta.cover;
		if (!cover || cover.length === 0) return null;
		try {
			const uint8Array = new Uint8Array(cover);
			const blob = new Blob([uint8Array], { type: 'image/jpeg' });
			return URL.createObjectURL(blob);
		} catch {
			return null;
		}
	});

	const [percent, setPercent] = createSignal(0);
	let cleanupRef: (() => void) | undefined;

	onMount(async () => {
		// Очистка предыдущего URL если есть
		cleanupRef = () => {
			const url = coverUrl();
			if (url) URL.revokeObjectURL(url);
		};

		if (!props.book.chapters?.length) return;

		const pos = await getReadingPosition(props.book.meta.path);
		if (!pos?.anchor_text) return;

		const chaptersText = props.book.chapters.map((c: any) => stripHtml(c.html));

		const fullText = chaptersText.join('\n');
		const anchor = pos.anchor_text.trim();

		const index = fullText.indexOf(anchor);
		if (index < 0) return;

		const value = Math.round((index / fullText.length) * 100);

		setPercent(Math.min(Math.max(value, 1), 100));
	});

	onCleanup(() => {
		// Очищаем blob URL при размонтировании
		if (cleanupRef) cleanupRef();
	});

	return (
		<div
			onClick={props.onClick}
			class={`
        group relative aspect-[2/3] rounded-xl overflow-hidden cursor-pointer
        bg-[var(--surface)] hover:bg-[var(--surface-hover)]
        border border-[var(--border)] hover:border-[var(--border-strong)]
        transition-all duration-200 hover:scale-[1.02] hover:shadow-xl
        animate-fade-in ${props.class}
      `}
			style={{ 'animation-delay': `${Math.min(props.index, 20) * 0.03}s` }}
		>
			{percent() > 0 && (
				<div class='absolute bottom-0 left-0 right-0 h-[3px] pointer-events-none z-1'>
					<div
						class='h-full transition-[width] duration-200'
						style={{
							width: `${percent()}%`,
							background: 'var(--primary)',
							'border-radius': '0 0 12px 12px',
						}}
					/>
				</div>
			)}
			{/* Cover */}
			<div class='absolute top-2 text-sm bg-(--background) rounded-md right-2 p-1 z-10 border-[1px] border-(--surface)'>
				{getFileExtension(props.book.meta.path)}
			</div>
			<Show
				when={coverUrl()}
				fallback={
					<div class='absolute inset-0 flex items-center justify-center p-4'>
						<div class='text-center'>
							<Icon
								name='book'
								size={32}
								class='mx-auto mb-2 text-[var(--foreground-muted)]'
							/>
							<p class='text-xs text-[var(--foreground-muted)] line-clamp-3'>
								{props.book.meta.title}
							</p>
						</div>
					</div>
				}
			>
				<img
					src={coverUrl()!}
					alt={props.book.meta.title}
					class='absolute inset-0 w-full h-full object-cover'
					loading='lazy'
				/>
			</Show>

			{/* Gradient overlay */}
			<div class='absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[var(--background)]/100 via-[var(--background)]/60 to-transparent' />

			{/* Info overlay */}
			<div class='absolute inset-x-0 bottom-0 p-3'>
				<h3 class='text-white font-medium text-sm line-clamp-2 drop-shadow-lg'>
					{props.book.meta.title || 'Без названия'}
				</h3>
				<Show when={props.book.meta.author}>
					<p class='text-white/70 text-xs mt-1 truncate drop-shadow'>
						{props.book.meta.author}
					</p>
				</Show>
			</div>
		</div>
	);
};


export const BookCardList = (props: BookCardProps) => {
  const coverUrl = createMemo(() => {
		const cover = props.book.meta.cover;
		if (!cover || cover.length === 0) return null;
		try {
			const uint8Array = new Uint8Array(cover);
			const blob = new Blob([uint8Array], { type: 'image/jpeg' });
			return URL.createObjectURL(blob);
		} catch {
			return null;
		}
	});

	const [percent, setPercent] = createSignal(0);
	let cleanupRef: (() => void) | undefined;

	onMount(async () => {
		// Очистка предыдущего URL если есть
		cleanupRef = () => {
			const url = coverUrl();
			if (url) URL.revokeObjectURL(url);
		};

		if (!props.book.chapters?.length) return;

		const pos = await getReadingPosition(props.book.meta.path);
		if (!pos?.anchor_text) return;

		const chaptersText = props.book.chapters.map((c: any) => stripHtml(c.html));

		const fullText = chaptersText.join('\n');
		const anchor = pos.anchor_text.trim();

		const index = fullText.indexOf(anchor);
		if (index < 0) return;

		const value = Math.round((index / fullText.length) * 100);

		setPercent(Math.min(Math.max(value, 1), 100));
	});

	onCleanup(() => {
		// Очищаем blob URL при размонтировании
		if (cleanupRef) cleanupRef();
	});


  return (
		<GlassPanel
			class={` 
           flex items-center gap-4 cursor-pointer 
          hover:bg-[var(--surface-hover)]  transition-all duration-150
          animate-fade-in stagger-${Math.min(props.index + 1, 8)} ${props.class}
        `}
			padding='sm'
			rounded='lg'
			onClick={props.onClick}
		>
			{percent() > 0 && (
				<div
					class='absolute inset-0 rounded-xl z-[5] pointer-events-none overflow-hidden'
					style={{ 'z-index': 0 }}
				>
					<div
						class='h-full transition-[width] duration-200 bg-(--primary)/10'
						style={{ width: `${percent()}%` }}
					/>
				</div>
			)}
			
			{/* Cover */}
			<div class='w-12 h-16 rounded-md overflow-hidden bg-[var(--surface-hover)] shrink-0 relative z-10'>
				<Show
					when={coverUrl()}
					fallback={
						<div class='w-full h-full flex items-center justify-center'>
							<Icon
								name='book'
								size={20}
								class='text-[var(--foreground-muted)]'
							/>
						</div>
					}
				>
					<img
						onError={() => (
							<Icon
								name='book'
								size={20}
								class='text-[var(--foreground-muted)]'
							/>
						)}
						src={coverUrl()!}
						alt=''
						class='w-full h-full object-cover'
					/>
				</Show>
			</div>

			{/* Info */}
			<div class='flex-1 min-w-0 relative z-10'>
				<h3 class='font-medium truncate'>
					{props.book.meta.title || 'Без названия'}
				</h3>
				<p class='text-sm text-[var(--foreground-muted)] truncate'>
					{props.book.meta.author || 'Неизвестный автор'}
				</p>
			</div>

			{/* Chapters count */}
			<span class='text-xs text-[var(--foreground-muted)] shrink-0 relative z-10'>
				{props.book.chapters?.length ?? 0} глав
			</span>

			<Icon
				name='chevronRight'
				size={18}
				class='text-[var(--foreground-muted)] relative z-10'
			/>
		</GlassPanel>
	);
};