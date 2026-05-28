import { createSignal, onMount, Show, createMemo, For } from "solid-js";
import { useParams, useNavigate, redirect } from "@solidjs/router";
import { openBook } from "../../../shared/api/book";
import { getBookmarks, type Bookmark } from "../../../shared/api/bookmarks";
import { toast } from 'solid-sonner';
import { GlassPanel } from "../../../shared/ui/GlassPanel";
import { GlassButton } from "../../../shared/ui/GlassButton";
import { Icon } from "../../../shared/ui/Icon";
import type { Book, Chapter } from "../../../shared/types/book";
import { getCoverDataUrl, getFileExtension } from "../../../shared/utils/file";
import { BookLoader } from "../../../shared/ui/Loader";
import { ensureBooksLoaded, reader, setReader, updateBook } from "../../../shared/stores/readerStore";
import { MobilePadding } from "@/widgets/layout/MobilePadding";
import * as htmlToImage from 'html-to-image';
import { htmlStringToBase64 } from "@/shared/utils/html";
import { getTimeAgo } from "@/shared/utils/date";
import { formatFileSize, timeRead } from "@/shared/utils/text";
import { formattedTime } from "@/shared/utils/time";

export function BookDetailPage() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [book, setBook] = createSignal<Book | null>(null);
  const [bookmarks, setBookmarks] = createSignal<Bookmark[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
	const [showBookmarks, setShowBookmarks] = createSignal(false);
	const [showChapters, setShowChapters] = createSignal(1);

  onMount(async () => {
    await loadBook();
  });

async function loadBook() {
	setIsLoading(true);
	try {
		await ensureBooksLoaded();

		if (!params.id) {
			throw Error('Book ID is missing');
		}

const libraryBook =
		reader.books.find((b) => b.id === params.id) ??
		reader.books.find((b) => b.id === reader.bookId);

	if (!libraryBook) {
		throw Error('Book not found in library');
	}

		if (!libraryBook?.meta?.path) {
			throw Error('Book not found in library or missing path');
		}

		if ((libraryBook.chapters ?? []).length > 0) {
			if (!libraryBook.meta.cover) {
				console.log('no cover, trying to generate from first chapter');
				let cBook = {...libraryBook};
				updateBook({
					...cBook,
					meta: {
						...cBook.meta,
						cover: await htmlStringToBase64(cBook.chapters[0].html),
					}
				});
			}
      setBook(libraryBook);
			const bms = await getBookmarks(libraryBook.meta.path);
			setBookmarks(bms);
      return;
    }

		let data = await openBook(libraryBook.meta.path);
		if (!data.meta.cover) {
			console.log('no cover, trying to generate from first chapter');
			data.meta.cover = await htmlStringToBase64(data.chapters[0].html);
		}
		setBook(data);

		setReader('books', (prev) => {
			const index = prev.findIndex((b) => b.id === libraryBook.id);
			if (index === -1) return prev;
			const copy = [...prev];
			copy[index] = data;
			return copy;
		});

		const bms = await getBookmarks(data.meta.path);
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


  const sortedChapters = createMemo(() =>
    [...(book()?.chapters ?? [])].sort((a, b) => a.order - b.order),
  );

	const handleCopyPath = () => {
		navigator.clipboard.writeText(book()!.meta.path);
		toast.success('Путь скопирован');
	}

  return (
			<div class='h-full overflow-y-auto'>
				{/* Loading state */}
				<BookLoader loading={isLoading} />

				<Show when={!isLoading() && book()}>
					<div class='max-w-5xl mx-auto relative'>
						{/* Back button */}
						<header data-tauri-drag-region class=' h-8 sticky top-4 z-1'>
							<button
								onClick={() => navigate('/')}
								class='flex items-center gap-2 ml-4 mt-4 text-muted-foreground border hover:border-foreground/40 border-border hover:text-foreground p-2 rounded-full backdrop-blur-lg transition-colors '
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
										when={book()?.meta.cover}
										fallback={
											<div class='w-full h-full flex items-center justify-center rounded-lg bg-secondary/60'>
												<div class='text-center p-6'>
													<Icon
														name='book'
														size={48}
														class='mx-auto mb-3 text-muted-foreground'
													/>
													<p class='text-sm text-muted-foreground'>Нет обложки</p>
												</div>
											</div>
										}
									>
										<img
											loading='lazy'
											src={book()?.meta.cover!}
											alt={book()!.meta.title}
											class=' h-full object-cover aspect-2/3 overflow-hidden rounded-lg'
										/>
									</Show>
								</div>
							</div>

							{/* Details */}
							<div class='md:col-span-2 space-y-3'>
								{/* Title and author */}
								<div>
									<h1 class='text-2xl md:text-3xl font-bold mb-2'>
										{book()!.meta.title}
									</h1>
									<Show when={book()!.meta.author}>
										<p class='text-lg text-muted-foreground'>{book()!.meta.author}</p>
									</Show>
								</div>

								{/* Meta badges */}
								<div class='space-y-3'>
									{/* badges */}
									<div class='flex flex-wrap gap-2'>
										<Show when={book()!.meta.language}>
											<div class='px-3 py-1.5 rounded-full text-xs font-medium bg-secondary border border-border text-secondary-foreground backdrop-blur-sm'>
												{book()!.meta.language}
											</div>
										</Show>

										<div class='px-3 py-1.5 rounded-full text-xs font-medium bg-secondary border border-border text-secondary-foreground'>
											{book()!.chapters?.length ?? 0} глав
										</div>

										<div class='px-3 py-1.5 rounded-full text-xs font-medium bg-secondary border border-border uppercase tracking-wide text-secondary-foreground'>
											{getFileExtension(book()!.meta?.path)}
										</div>
									</div>

									{/* info */}
									<div class='grid grid-cols-2 sm:grid-cols-3 gap-1 text-sm'>
										<div class='rounded-2xl bg-secondary border border-border p-2 group'>
											<div class='text-muted-foreground text-xs mb-1'>
												Уникальный ID
											</div>
											<div class='font-mono text-xs break-all opacity-90 line-clamp-1 group-hover:line-clamp-none'>
												{book()!.id}
											</div>
										</div>

										<div
											class='rounded-2xl bg-secondary border border-border p-2 sm:col-span-2 group'
											onClick={handleCopyPath}
										>
											<div class='text-muted-foreground text-xs mb-1'>Путь</div>
											<div class='font-mono text-xs break-all opacity-80 line-clamp-1 group-hover:line-clamp-none'>
												{book()!.meta.path.split('/').slice(-1)[0]}
											</div>
										</div>

										<div class='rounded-2xl bg-secondary border border-border p-2 group'>
											<div class='text-muted-foreground text-xs mb-1'>Добавлено</div>
											<div class='line-clamp-1 group-hover:line-clamp-none'>
												{getTimeAgo(book()!.meta.lastModified)}
											</div>
										</div>

										<div class='rounded-2xl bg-secondary border border-border p-2'>
											<div class='text-muted-foreground text-xs mb-1'>
												Время чтения
											</div>
											<div>
												{formattedTime(timeRead(book()?.meta.charsRead ?? 0), 'm')}
											</div>
										</div>
										<div class='rounded-2xl bg-secondary border border-border p-2'>
											<div class='text-muted-foreground text-xs mb-1'>Размер</div>
											<div>{formatFileSize(book()!.meta.size)}</div>
										</div>
									</div>
								</div>

								<div>
									<div class='text-muted-foreground text-xs mb-1'>Жанры</div>
									<div class='flex flex-wrap gap-1'>
										{book()?.meta.genres?.map(genre => (
											<div class='rounded-full bg-secondary text-muted-foreground px-2 py-1'>
												{genre}
											</div>
										))}
									</div>
									<div>{book()?.meta.description}</div>
								</div>

								{/* Actions */}
								<div class='flex flex-wrap gap-3'>
									<GlassButton variant='primary' size='lg' onClick={handleStartReading}>
										<Icon name='bookOpen' size={20} />
										Читать
									</GlassButton>
									<GlassButton size='lg' onClick={toggleShowBookmarks}>
										<Icon
											class={`${showBookmarks() ? 'fill-foreground' : ''} transition-all`}
											name='bookmark'
											size={20}
										/>
										Закладки ({bookmarks().length})
									</GlassButton>
								</div>

								{/* Bookmarks preview */}
								<Show when={bookmarks().length > 0 && showBookmarks()}>
									<GlassPanel class='space-y-2 ' padding='md' rounded='xl'>
										<h3 class='font-medium text-sm text-muted-foreground mb-3'>
											Последние закладки
										</h3>
										<For each={bookmarks().slice(0, 3)}>
											{bm => (
												<div class='flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/60 cursor-pointer transition-colors'>
													<Icon
														name='bookmarkSolid'
														size={16}
														class='text-primary mt-0.5 shrink-0'
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
						<div class='mt-10 px-6 pb-6'>
							<div class='flex items-center justify-between mb-4 gap-4 flex-wrap'>
								<h2 class='text-lg font-semibold flex items-center gap-2'>
									<Icon name='listBullet' size={20} />
									Содержание
								</h2>

								{/* быстрая навигация */}
								<div class='flex items-center gap-2 text-xs'>
									<button
										onClick={() => setShowChapters(1)}
										class='px-3 py-1 rounded-lg bg-secondary hover:bg-secondary/60 transition-colors'
									>
										Начало
									</button>

									<button
										onClick={() => setShowChapters(prev => Math.max(1, prev - 1))}
										class='px-3 py-1 rounded-lg bg-secondary hover:bg-secondary/60 transition-colors'
									>
										Назад
									</button>

									<span class='px-3 py-1 text-muted-foreground'>
										{Math.min(showChapters() * 30, sortedChapters().length)} /{' '}
										{sortedChapters().length}
									</span>

									<Show when={showChapters() * 30 < sortedChapters().length}>
										<button
											onClick={() => setShowChapters(prev => prev + 1)}
											class='px-3 py-1 rounded-lg bg-secondary hover:bg-secondary/60 transition-colors'
										>
											Далее
										</button>
									</Show>
								</div>
							</div>

							<GlassPanel padding='none' rounded='xl'>
								<div class='divide-y divide-border '>
									<For each={sortedChapters().slice(0, showChapters() * 30)}>
										{(chapter, index) => {
											return (
												<button
													onClick={() => handleChapterClick(chapter)}
													class={`
								w-full flex items-center justify-between rounded-none!
								px-4 py-3 text-left transition-all
								hover:bg-secondary/60
								first:rounded-t-xl
								last:rounded-b-xl
							`}
												>
													<div class='flex items-center gap-3 min-w-0'>
														<div
															class={`
										w-7 h-7 rounded-lg flex items-center justify-center
										text-xs shrink-0
									`}
														>
															{index() + 1}
														</div>

														<div class='truncate text-sm'>
															{chapter.title || `Глава ${chapter.order + 1}`}
														</div>
													</div>

													<Icon
														name='chevronRight'
														size={16}
														class={`
									shrink-0 transition-transform
									text-muted-foreground
								`}
													/>
												</button>
											);
										}}
									</For>

									<Show when={showChapters() * 30 < sortedChapters().length}>
										<button
											onClick={() => setShowChapters(prev => prev + 1)}
											class='w-full py-4 text-sm text-muted-foreground hover:bg-secondary/60 transition-colors'
										>
											Показать ещё{' '}
											{Math.min(30, sortedChapters().length - showChapters() * 30)} глав
										</button>
									</Show>
								</div>
							</GlassPanel>
						</div>
					</div>
					<MobilePadding />
				</Show>
			</div>
		);
}
