import { createSignal, onMount, Show, createMemo, For } from "solid-js";
import { useParams, useNavigate, redirect } from "@solidjs/router";
import { openBook } from "../../../shared/api/book";
import { getBookmarks, type Bookmark } from "../../../shared/api/bookmarks";
import { setCurrentBook } from "../../../shared/api/reader";
import { toast } from "../../../shared/stores/toastStore";
import { GlassPanel } from "../../../shared/ui/GlassPanel";
import { GlassButton } from "../../../shared/ui/GlassButton";
import { Icon } from "../../../shared/ui/Icon";
import type { Book, Chapter } from "../../../shared/types/book";
import { getFileExtension } from "../../../shared/utils/file";
import { BookLoader } from "../../../shared/ui/Loader";
import { reader, setReader } from "../../../shared/stores/readerStore";
import { MobilePadding } from "@/widgets/layout/MobilePadding";

export function BookDetailPage() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [book, setBook] = createSignal<Book | null>(null);
  const [bookmarks, setBookmarks] = createSignal<Bookmark[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
	const [showBookmarks, setShowBookmarks] = createSignal(false);
	

  onMount(async () => {
    await loadBook();
  });

async function loadBook() {
	setIsLoading(true);
	try {
		if (!params.id) {
			throw Error('Book ID is missing');
		}
    
		const libraryBookIndex = reader.books.findIndex(b => b.id === params.id) ?? reader.books.findIndex(b => b.id === reader.bookId);

		if (libraryBookIndex === -1) {
			throw Error('Book not found in library');
		}

		const libraryBook = reader.books[libraryBookIndex];

		if (!libraryBook?.meta?.path) {
			throw Error('Book not found in library or missing path');
		}

		if ((libraryBook.chapters ?? []).length > 0) {
      setBook(libraryBook);
			const bms = await getBookmarks(libraryBook.meta.path);
			setBookmarks(bms);
      return;
    };

		const data = await openBook(libraryBook.meta.path);
		setBook(data);

		setReader('books', prev => {
			const copy = [...prev];
			copy[libraryBookIndex] = data;
			return copy;
		});

		const bms = await getBookmarks(params.id);
		setReader({
			bookId: data.id,
			chapters: data.chapters,
		});
		setBookmarks(bms);
	} catch (err) {
		console.error('Failed to load book:', err);
		toast.error('Не удалось загрузить книгу');
		redirect('/');
	} finally {
		setIsLoading(false);
	}
}

	const toggleShowBookmarks = () => {
		setShowBookmarks(!showBookmarks());
	}

  async function handleStartReading() {
    try {
      navigate(`/book/${params.id}/read`);
    } catch (err) {
      console.error("Failed to set current book:", err);
      toast.error("Ошибка при открытии книги");
    }
  }

  function handleChapterClick(chapter: Chapter) {
    navigate(`/book/${params.id}/read?chapter=${chapter.id}`);
  }

  const coverUrl = createMemo(() => {
    const cover = book()?.meta.cover;
    if (!cover || cover.length === 0) return null;
    try {
      const uint8Array = new Uint8Array(cover);
      const blob = new Blob([uint8Array], { type: "image/jpeg" });
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  });

  const sortedChapters = createMemo(() =>
    [...(book()?.chapters ?? [])].sort((a, b) => a.order - b.order),
  );

  return (
		<div class='h-full overflow-y-auto'>
			{/* Loading state */}
			<BookLoader loading={isLoading} />

			<Show when={!isLoading() && book()}>
				<div class='max-w-5xl mx-auto relative'>
					{/* Back button */}
					<header data-tauri-drag-region class=' h-8 sticky top-4'>
						<button
							onClick={() => navigate('/')}
							class='flex items-center gap-2 ml-4 mt-4 text-(--foreground-muted) border hover:border-(--foreground)/40 border-(--border) hover:text-(--foreground) p-2 rounded-full backdrop-blur-lg transition-colors'
						>
							<Icon name='chevronLeft' size={18} class='-ml-0.5' />
						</button>
					</header>

					{/* Main info */}
					<div class='grid mt-6 grid-cols-1 md:grid-cols-3 gap-8 pl-6 pr-6'>
						{/* Cover */}
						<div class='md:col-span-1'>
							<div class=' overflow-hidden max-h-[50vh] h-full w-full flex justify-center items-center'>
								<Show
									when={coverUrl()}
									fallback={
										<div class='w-full h-full flex items-center justify-center rounded-lg bg-(--surface-hover)'>
											<div class='text-center p-6'>
												<Icon
													name='book'
													size={48}
													class='mx-auto mb-3 text-(--foreground-muted)'
												/>
												<p class='text-sm text-(--foreground-muted)'>
													Нет обложки
												</p>
											</div>
										</div>
									}
								>
									<img
										src={coverUrl()!}
										alt={book()!.meta.title}
										class=' h-full object-cover aspect-2/3 overflow-hidden rounded-lg'
									/>
								</Show>
							</div>
						</div>

						{/* Details */}
						<div class='md:col-span-2 space-y-6'>
							{/* Title and author */}
							<div>
								<h1 class='text-2xl md:text-3xl font-bold mb-2'>
									{book()!.meta.title}
								</h1>
								<Show when={book()!.meta.author}>
									<p class='text-lg text-(--foreground-muted)'>
										{book()!.meta.author}
									</p>
								</Show>
							</div>

							{/* Meta badges */}
							<div class='flex flex-wrap gap-2'>
								<Show when={book()!.meta.language}>
									<span class='px-3 py-1 rounded-full text-xs font-medium bg-(--surface) border border-(--border)'>
										{book()!.meta.language}
									</span>
								</Show>
								<span class='px-3 py-1 rounded-full text-xs font-medium bg-(--surface) border border-(--border)'>
									{book()!.chapters?.length ?? 0} глав
								</span>
								<span class='px-3 py-1 rounded-full text-xs font-medium bg-(--surface) border border-(--border)'>
									{getFileExtension(book()!.meta?.path)}
								</span>
							</div>

							{/* Actions */}
							<div class='flex flex-wrap gap-3'>
								<GlassButton
									variant='primary'
									size='lg'
									onClick={handleStartReading}
								>
									<Icon name='bookOpen' size={20} />
									Читать
								</GlassButton>
								<GlassButton size='lg' onClick={toggleShowBookmarks}>
									<Icon class={`${showBookmarks() ? 'fill-(--foreground)' : ''} transition-all`} name='bookmark' size={20} />
									Закладки ({bookmarks().length})
								</GlassButton>
							</div>

							{/* Bookmarks preview */}
							<Show when={bookmarks().length > 0 && showBookmarks()}>
								<GlassPanel class='space-y-2 ' padding='md' rounded='xl'>
									<h3 class='font-medium text-sm text-(--foreground-muted) mb-3'>
										Последние закладки
									</h3>
									<For each={bookmarks().slice(0, 3)}>
										{bm => (
											<div class='flex items-start gap-3 p-2 rounded-lg hover:bg-(--surface-hover) cursor-pointer transition-colors'>
												<Icon
													name='bookmarkSolid'
													size={16}
													class='text-(--primary) mt-0.5 shrink-0'
												/>
												<p class='text-sm line-clamp-2'>{bm.preview}</p>
											</div>
										)}
									</For>
								</GlassPanel>
							</Show>
						</div>
					</div>

					{/* Table of contents */}
					<div class='mt-10 pl-6 pb-6 pr-6'>
						<h2 class='text-lg font-semibold mb-4 flex items-center gap-2'>
							<Icon name='listBullet' size={20} />
							Содержание
						</h2>
						<GlassPanel padding='none' rounded='xl'>
							<div class='divide-y divide-(--border)'>
								<For each={sortedChapters().slice(0, 30)}>
									{(chapter, index) => (
										<button
											onClick={() => handleChapterClick(chapter)}
											class='w-full flex items-center justify-between px-4 py-3 text-left
                             hover:bg-(--surface-hover) transition-colors'
										>
											<span class='flex items-center gap-3'>
												<span class='text-xs text-(--foreground-muted) w-6'>
													{index() + 1}
												</span>
												<span class='text-sm'>
													{chapter.title || `Глава ${chapter.order + 1}`}
												</span>
											</span>
											<Icon
												name='chevronRight'
												size={16}
												class='text-(--foreground-muted)'
											/>
										</button>
									)}
								</For>
								<Show when={sortedChapters().length > 30}>
									<div class='px-4 py-3 text-center text-sm text-(--foreground-muted)'>
										И ещё {sortedChapters().length - 30} глав...
									</div>
								</Show>
							</div>
						</GlassPanel>
					</div>
				</div>
				<MobilePadding/>
			</Show>
		</div>
	);
}
