import { createSignal, onMount, onCleanup, For, Show, createMemo, Component } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { open } from "@tauri-apps/plugin-dialog";
import { addBooks, addBook } from "../../shared/api/book";
import { toast } from "../../shared/stores/toastStore";
import { GlassButton } from "../../shared/ui/GlassButton";
import { GlassPanel } from "../../shared/ui/GlassPanel";
import { Icon } from "../../shared/ui/Icon";
import { Search } from "../../components/layout/Search";
import { AddMenu } from "../../components/layout/AddMenu";
import { Select } from "../../shared/ui/Select";
import { ensureBooksLoaded, reader, setReader } from "../../shared/stores/readerStore";
import { MobilePadding } from "@/widgets/layout/MobilePadding";
import { Book as BookType } from "../../shared/types/book";
import { getReadingPosition } from "../../shared/api/reader";
import { stripHtml } from "../../shared/utils/html";
import { getFileExtension } from "../../shared/utils/file";
import { SkeletonLibrary } from "@/features/library/components/Skeleton";

type SortKey = "title" | "author" | "recent";

type BookCardBaseProps = {
	book: BookType;
	index: number;
	onClick: () => void;
};

// Оптимизированная карточка для Grid режима (без переключения viewMode)
const BookGridCard: Component<BookCardBaseProps> = (props) => {
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
		if (cleanupRef) cleanupRef();
	});

	return (
		<div
			onClick={props.onClick}
			class={`
				group relative aspect-[2/3] rounded-lg overflow-hidden cursor-pointer
				bg-[var(--surface)] hover:bg-[var(--surface-hover)]
				border border-[var(--border)] hover:border-[var(--border-strong)]
				transition-all duration-200 hover:scale-[1.02] hover:shadow-xl
				animate-fade-in
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
			<div class='absolute top-2 text-sm bg-(--background) rounded-md right-2 p-1 z-10 border-[1px] border-(--surface)'>
				{getFileExtension(props.book.meta.path)}
			</div>
			<Show
				when={coverUrl()}
				fallback={
					<div class='absolute inset-0 flex items-center justify-center p-4'>
						<div class='text-center'>
							<Icon name='book' size={32} class='mx-auto mb-2 text-[var(--foreground-muted)]' />
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
			<div class='absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[var(--background)]/100 via-[var(--background)]/60 to-transparent' />
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

// Оптимизированная карточка для List режима (без переключения viewMode)
const BookListCard: Component<BookCardBaseProps> = (props) => {
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
		if (cleanupRef) cleanupRef();
	});

	return (
		<GlassPanel
			class={`
				flex items-center gap-4 cursor-pointer
				hover:bg-[var(--surface-hover)] transition-all duration-150 overflow-hidden
				animate-fade-in
			`}
			padding='sm'
			rounded='md'
			onClick={props.onClick}
		>
			{percent() > 0 && (
				<div class='absolute inset-0 rounded-md z-[5] pointer-events-none overflow-hidden'>
					<div
						class='h-full transition-[width] duration-200 bg-(--primary)/10'
						style={{ width: `${percent()}%` }}
					/>
				</div>
			)}
			<div class='w-12 h-16 rounded-md overflow-hidden bg-[var(--surface-hover)] shrink-0 relative z-10'>
				<Show
					when={coverUrl()}
					fallback={
						<div class='w-full h-full flex items-center justify-center'>
							<Icon name='book' size={20} class='text-[var(--foreground-muted)]' />
						</div>
					}
				>
					<img
						onError={(e) => {
							const target = e.target as HTMLImageElement;
							target.style.display = 'none';
						}}
						src={coverUrl()!}
						alt=''
						class='w-full h-full object-cover'
					/>
				</Show>
			</div>
			<div class='flex-1 min-w-0 relative z-10'>
				<h3 class='font-medium truncate'>
					{props.book.meta.title || 'Без названия'}
				</h3>
				<p class='text-sm text-[var(--foreground-muted)] truncate'>
					{props.book.meta.author || 'Неизвестный автор'}
				</p>
			</div>
			<span class='text-xs text-[var(--foreground-muted)] shrink-0 relative z-10'>
				{props.book.chapters?.length ?? 0} глав
			</span>
			<Icon name='chevronRight' size={18} class='text-[var(--foreground-muted)] relative z-10' />
		</GlassPanel>
	);
};

export function LibraryPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = createSignal(!reader.booksLoaded);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [sortKey, setSortKey] = createSignal<SortKey>("title");
  const [viewMode, setViewMode] = createSignal<"grid" | "list">("grid");
  let isMounted = true;

  onMount(async () => {
    if (reader.booksLoaded) {
      setIsLoading(false);
      return;
    }

    await loadBooks();
  });

  onCleanup(() => {
    isMounted = false;
  });

  async function loadBooks() {
    setIsLoading(true);
    try {
      await ensureBooksLoaded();
    } catch (err) {
      console.error("Failed to load books:", err);
      toast.error("Не удалось загрузить библиотеку");
    } finally {
      if (isMounted) {
        setIsLoading(false);
      }
    }
  }

  async function handleAddFolder() {
    const folder = await open({ directory: true });
    if (!folder) return;

    try {
      const newBooks = await addBooks(folder);
      // Добавляем новые книги к существующим, а не заменяем все
      setReader({
        books: [...reader.books, ...newBooks],
        booksLoaded: true,
      });
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
          name: "Books",
          extensions: ["epub", "pdf", "fb2", "txt", "html", "htm", "md"],
        },
      ],
    });
    if (!file) return;

    try {
      await addBook(file);
      await ensureBooksLoaded(true);
      toast.success("Книга добавлена");
    } catch (err) {
      console.error("Failed to add book:", err);
      toast.error("Ошибка при добавлении книги");
    }
  }

  const filteredBooks = createMemo(() => {
    const books = reader.books;
    if (!books || books.length === 0) return [];
    
    let result = [...books];

    // Filter by search
    const query = searchQuery().toLowerCase().trim();
    if (query) {
      result = result.filter(
        (b) =>
          (b.meta.title ?? "Без названия").toLowerCase().includes(query) ||
          (b.meta.author?.toLowerCase().includes(query) ?? false),
      );
    }

    // Sort
    switch (sortKey()) {
      case "title":
        result.sort((a, b) => (a.meta.title ?? "").localeCompare(b.meta.title ?? ""));
        break;
      case "author":
        result.sort((a, b) =>
          (a.meta.author ?? "").localeCompare(b.meta.author ?? ""),
        );
        break;
      case "recent":
        result.reverse();
        break;
    }

    return result;
  });

  return (
		<div class='h-full flex flex-col overflow-hidden'>
			<header
				data-tauri-drag-region
				class='shrink-0 px-4 py-2 border-b border-(--border) bg-(--background)'
			>
				<div class='flex items-center justify-between gap-4'>
					{/* <h1 class='text-xl font-semibold'>Библиотека</h1> */}

					<div class='flex items-center justify-between gap-2 w-full'>
						<div class='flex items-center gap-2'>
							<Search
								searchQuery={searchQuery()}
								setSearchQuery={setSearchQuery}
							/>
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
							<div class='flex rounded-lg overflow-hidden border border-[var(--border)]'>
								<button
									onClick={() => setViewMode('grid')}
									class={`p-2 transition-colors ${
										viewMode() === 'grid'
											? 'bg-(--primary) text-(--primary-foreground)'
											: 'hover:bg-(--surface)'
									}`}
								>
									<Icon name='bars3' size={18} />
								</button>
								<button
									onClick={() => setViewMode('list')}
									class={`p-2 transition-colors ${
										viewMode() === 'list'
											? 'bg-(--primary) text-(--primary-foreground)'
											: 'hover:bg-(--surface)'
									}`}
								>
									<Icon name='listBullet' size={18} />
								</button>
							</div>
							<AddMenu
								onAddFile={handleAddFile}
								onAddFolder={handleAddFolder}
							/>
						</div>

						{/* Add buttons */}
					</div>
				</div>
			</header>

			{/* Content */}
			<div class='flex-1 overflow-y-auto p-6'>
				<SkeletonLibrary loading={isLoading} />

				<Show when={!isLoading() && filteredBooks().length === 0}>
					<div class='flex flex-col items-center justify-center h-64 gap-4'>
						<Icon
							name='book'
							size={48}
							class='text-[var(--foreground-muted)]'
						/>
						<p class='text-[var(--foreground-muted)]'>
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
								<For each={filteredBooks()} fallback={null}>
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
							<For each={filteredBooks()} fallback={null}>
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
