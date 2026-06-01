import {
	createSignal,
	onMount,
	onCleanup,
	For,
	Show,
	createMemo,
	Component,
	createEffect,
} from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { open } from '@tauri-apps/plugin-dialog';
import { addBooks, addBook } from '../../shared/api/book';
import { toast } from 'solid-sonner';
import { GlassPanel } from '../../shared/ui/GlassPanel';
import { Icon } from '../../shared/ui/Icon';
import { Search } from '../../components/layout/Search';
import { AddMenu } from '../../components/layout/AddMenu';
import { Select } from '../../shared/ui/Select';
import {
	ensureBooksLoaded,
	reader,
	setReader,
	mergeBooksById,
} from '../../shared/stores/readerStore';
import { getBooksVersion } from '../../shared/api/book';
import { MobilePadding } from '@/widgets/layout/MobilePadding';
import { Book as BookType } from '../../shared/types/book';
import { CoverImage } from '../../shared/ui/CoverImage';
import { getFileExtension } from '../../shared/utils/file';
import { SkeletonLibrary } from '@/features/library/components/Skeleton';
import { GlassButton } from '@/shared/ui/GlassButton';

type SortKey = 'title' | 'author' | 'recent';

type BookCardBaseProps = {
	book: BookType;
	index: number;
	onClick: () => void;
};

const BookGridCard: Component<BookCardBaseProps> = props => {


	return (
		<div
			onClick={props.onClick}
			class={`
				group relative aspect-2/3 rounded-lg overflow-hidden cursor-pointer
				bg-secondary hover:bg-secondary-hover/60
				border border-border hover:border-border/60
				transition-all duration-200  hover:shadow-xl hover:border-primary
				animate-fade-in
			`}
			style={{ 'animation-delay': `${Math.min(props.index, 20) * 0.03}s` }}
		>
			{((props.book.meta.progress_read ?? 0) / props.book.meta.chars_read!) * 100 >
				0 && (
				<div class='absolute bottom-0 left-0 right-0 h-[12px] overflow-hidden rounded-b-[12px] pointer-events-none z-1'>
					<div
						class='h-full transition-[width] duration-200 border-primary rounded-bl-lg border-b-[2px]'
						style={{
							width: `${
								((props.book.meta.progress_read ?? 0) /
									(props.book.meta.chars_read ?? 0)) *
								100
							}%`,
						}}
					/>
				</div>
			)}
			<div class='absolute top-2 text-sm rounded-md right-2 p-1 py-0 z-10 border bg-secondary border-secondary/40'>
				{getFileExtension(props.book.meta.path)}
			</div>
			<CoverImage
				bookId={props.book.id}
				bookPath={props.book.meta.path}
				alt={props.book.meta.title}
				class='absolute inset-0 w-full h-full object-cover group-hover:scale-[1.05] transition-all'
			>
				<div class='absolute inset-0 flex items-center justify-center p-4'>
					<div class='text-center'>
						<Icon name='book' size={32} class='mx-auto mb-2 text-muted-foreground' />
						<p class='text-xs text-muted-foreground line-clamp-3'>
							{props.book.meta.title}
						</p>
					</div>
				</div>
			</CoverImage>
			<div class='absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-background via-background/60 to-transparent' />
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

const BookListCard: Component<BookCardBaseProps> = props => {
	return (
		<GlassPanel
			class={`
				flex items-center gap-4 cursor-pointer
				hover:bg-secondary-hover/60 transition-all duration-150 overflow-hidden
				animate-fade-in
			`}
			padding='sm'
			rounded='md'
			onClick={props.onClick}
		>
			{(props.book.meta.progress_read ?? 0) / (props.book.meta.chars_read ?? 0) * 100 > 0 && (
				<div class='absolute inset-0 rounded-md z-5 pointer-events-none overflow-hidden'>
					<div
						class='h-full transition-[width] duration-200 bg-primary/10'
						style={{ width: `${(props.book.meta.progress_read ?? 0) / (props.book.meta.chars_read ?? 0) * 100}%` }}
					/>
				</div>
			)}
			<div class='w-12 h-16 rounded-md overflow-hidden bg-secondary-hover/60 shrink-0 relative z-10'>
				<CoverImage
					bookId={props.book.id}
					bookPath={props.book.meta.path}
					alt=''
					class='w-full h-full object-cover'
				>
					<div class='w-full h-full flex items-center justify-center'>
						<Icon name='book' size={20} class='text-muted-foreground' />
					</div>
				</CoverImage>
			</div>
			<div class='flex-1 min-w-0 relative z-10'>
				<h3 class='font-medium truncate'>
					{props.book.meta.title || 'Без названия'}
				</h3>
				<p class='text-sm text-muted-foreground truncate'>
					{props.book.meta.author || 'Неизвестный автор'}
				</p>
			</div>
			<span class='text-xs text-muted-foreground shrink-0 relative z-10'>
				{props.book.chapters?.length ?? 0} глав
			</span>
			<Icon
				name='chevronRight'
				size={18}
				class='text-muted-foreground relative z-10'
			/>
		</GlassPanel>
	);
};


export function LibraryPage() {
	const navigate = useNavigate();

	const [isLoading, setIsLoading] = createSignal(!reader.booksLoaded);
	const [searchQuery, setSearchQuery] = createSignal('');
	const [sortKey, setSortKey] = createSignal<SortKey>('title');
	const [viewMode, setViewMode] = createSignal<'grid' | 'list'>('grid');

	const PAGE_SIZE = 60;
	const LOAD_MORE_STEP = 40;

	const [visibleCount, setVisibleCount] = createSignal(PAGE_SIZE);

	let isMounted = true;
	let scrollRef!: HTMLDivElement;

	onMount(async () => {
		if (reader.booksLoaded) {
			setIsLoading(false);
			return;
		}

		toast.info('Загрузка библиотеки...');
		await loadBooks();
		toast.info('Загрузка библиотеки завершена');
	});

	onCleanup(() => {
		isMounted = false;
	});

	async function loadBooks() {
		setIsLoading(true);

		try {
			await ensureBooksLoaded();
		} catch (err) {
			console.error(err);
			toast.error('Не удалось загрузить библиотеку');
		} finally {
			if (isMounted) {
				setIsLoading(false);
			}
		}
	}

	function handleScroll() {
		if (!scrollRef) return;

		const threshold = 300;

		const isNearBottom =
			scrollRef.scrollTop + scrollRef.clientHeight >=
			scrollRef.scrollHeight - threshold;

		if (isNearBottom && visibleCount() < filteredBooks().length) {
			setVisibleCount(prev =>
				Math.min(prev + LOAD_MORE_STEP, filteredBooks().length),
			);
		}
	}

	createEffect(() => {
		searchQuery();
		sortKey();

		setVisibleCount(PAGE_SIZE);

		queueMicrotask(() => {
			scrollRef?.scrollTo({
				top: 0,
				behavior: 'auto',
			});
		});
	});

	const filteredBooks = createMemo(() => {
		const books = reader.books ?? [];

		let result = [...books];

		const query = searchQuery().trim().toLowerCase();

		if (query) {
			result = result.filter(
				book =>
					book.meta.title?.toLowerCase().includes(query) ||
					book.meta.author?.toLowerCase().includes(query),
			);
		}

		switch (sortKey()) {
			case 'title':
				result.sort((a, b) =>
					(a.meta.title ?? '').localeCompare(b.meta.title ?? ''),
				);
				break;

			case 'author':
				result.sort((a, b) =>
					(a.meta.author ?? '').localeCompare(b.meta.author ?? ''),
				);
				break;

			case 'recent':
				result = [...result].reverse();
				break;
		}

		return result;
	});

	const visibleBooks = createMemo(() =>
		filteredBooks().slice(0, visibleCount()),
	);

	async function handleAddFolder() {
		const folder = await open({ directory: true });
		if (!folder) return;

		try {
			const id = toast("Загрузка книг из папки...", { duration: Number.POSITIVE_INFINITY });
			const newBooks = await addBooks(folder);
			const merged = mergeBooksById(reader.books, newBooks);
			setReader({ books: merged, booksLoaded: true });
			toast.info("Загрузка книг завершена");
			toast.dismiss(id);
			getBooksVersion().then((v) => setReader("booksVersion", v)).catch(() => {});
			toast.success(`Добавлено книг: ${newBooks.length}`);
		} catch (err) {
			console.error("Failed to add books:", err);
			toast.error("Ошибка при добавлении книг");
		}
	}

	async function handleAddFile() {
		const file = await open({
			directory: false,
			multiple: false,
			filters: [
				{
					name: 'Books',
					extensions: [
						'txt',
						'epub',
						'fb2',
						'zip',
						'html',
						'htm',
						'md',
						'markdown',
						'docx',
						'pdf',
						'cbz',
						'mobi',
						'rtf',
					],
				},
			],
		});
		console.log("Selected file:", file);
		if (!file) return;

		try {
			toast.info("Загрузка книги...");
			const added = await addBook(file);
			if (!added) throw new Error("No book returned from backend");
			const merged = mergeBooksById(reader.books, [added] as any);
			setReader({ books: merged, booksLoaded: true });
			toast.info("Загрузка книги завершена");
			getBooksVersion().then((v) => setReader("booksVersion", v)).catch(() => {});
			toast.success("Книга добавлена");
		} catch (err) {
			console.error("Failed to add book:", err);
			toast.error("Ошибка при добавлении книги");
		}
	}

	return (
		<div class='h-full flex flex-col overflow-hidden'>
			<header
				data-tauri-drag-region
				class='shrink-0 px-4 py-2 border-b border-border bg-background'
			>
				<div class='flex items-center justify-between gap-4'>
					<div class='flex items-center justify-between gap-2 w-full'>
						<div class='flex items-center gap-2'>
							<Search searchQuery={searchQuery()} setSearchQuery={setSearchQuery} />
							<Select
								options={[
									{ label: 'По названию', value: 'title' },
									{ label: 'По автору', value: 'author' },
									{ label: 'Недавние', value: 'recent' },
								]}
								value={sortKey()}
								onChange={value => setSortKey(value as SortKey)}
							/>
						</div>
						<div class='flex items-center gap-2'>
							<div class='flex rounded-lg overflow-hidden border border-border'>
								<button
									onClick={() => setViewMode('grid')}
									class={`p-2 transition-colors ${viewMode() === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
								>
									<Icon name='bars3' size={18} />
								</button>
								<button
									onClick={() => setViewMode('list')}
									class={`p-2 transition-colors ${viewMode() === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
								>
									<Icon name='listBullet' size={18} />
								</button>
							</div>
							<AddMenu onAddFile={handleAddFile} onAddFolder={handleAddFolder} />
						</div>
						{/* Add buttons */}
					</div>
				</div>
			</header>

			<div
				ref={scrollRef}
				onScroll={handleScroll}
				class='flex-1 overflow-y-auto p-6'
			>
				<SkeletonLibrary loading={isLoading} />

				<Show when={!isLoading() && filteredBooks().length === 0}>
					<div class='flex flex-col items-center justify-center h-64 gap-4'>
						<Icon name='book' size={48} class='text-muted-foreground' />
						<p class='text-muted-foreground'>
							{searchQuery() ? 'Книги не найдены' : 'Библиотека пуста'}
						</p>
						<Show when={!searchQuery()}>
							<GlassButton onClick={handleAddFolder} variant='primary'>
								<Icon name='folder' size={18} />
								Добавить книги
							</GlassButton>
						</Show>
					</div>
				</Show>

				<Show when={!isLoading() && filteredBooks().length > 0}>
					<Show
						when={viewMode() === 'grid'}
						fallback={
							<div class='flex flex-col gap-2'>
								<For each={visibleBooks()}>
									{(book, index) => (
										<BookListCard
											book={book}
											index={index()}
											onClick={() => navigate(`/book/${book.id}`)}
										/>
									)}
								</For>
							</div>
						}
					>
						<div class='grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2'>
							<For each={visibleBooks()}>
								{(book, index) => (
									<BookGridCard
										book={book}
										index={index()}
										onClick={() => navigate(`/book/${book.id}`)}
									/>
								)}
							</For>
						</div>
					</Show>
				</Show>

				<MobilePadding />
			</div>
		</div>
	);
}



