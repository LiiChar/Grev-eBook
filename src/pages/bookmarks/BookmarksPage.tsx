import { createSignal, onMount, For, Show, createMemo } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { getBookmarks, deleteBookmark, type Bookmark } from '../../shared/api/bookmarks';
import { getNotes, deleteNote } from '../../shared/api/notes';
import { getBooks } from '../../shared/api/book';
import { toast } from 'solid-sonner';
import { GlassPanel } from '../../shared/ui/GlassPanel';
import { GlassButton } from '../../shared/ui/GlassButton';
import { Icon } from '../../shared/ui/Icon';
import type { Book } from '../../shared/types/book';
import { BookLoader } from '../../shared/ui/Loader';
import { Select } from '../../shared/ui/Select';
import { getBook } from '../../shared/stores/readerStore';
import { Note } from '../../shared/types/note';

type TabId = 'bookmarks' | 'notes';

export function BookmarksPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = createSignal<TabId>('bookmarks');
  const [bookmarks, setBookmarks] = createSignal<Bookmark[]>([]);
  const [notes, setNotes] = createSignal<Note[]>([]);
  const [books, setBooks] = createSignal<Book[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [filterBookId, setFilterBookId] = createSignal<string | null>(null);

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    setIsLoading(true);
    try {
      const [bms, ns, bks] = await Promise.all([
        getBookmarks(),
        getNotes(),
        getBooks(),
      ]);
      setBookmarks(bms);
      setNotes(ns);
      setBooks(bks);
    } catch (err) {
      console.error('Failed to load data:', err);
      toast.error('Не удалось загрузить данные');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteBookmark(id: string) {
    try {
      await deleteBookmark(id);
      setBookmarks((bms) => bms.filter((b) => b.id !== id));
      toast.success('Закладка удалена');
    } catch (err) {
      console.error('Failed to delete bookmark:', err);
      toast.error('Не удалось удалить закладку');
    }
  }

  async function handleDeleteNote(id: string) {
    try {
      await deleteNote(id);
      setNotes((ns) => ns.filter((n) => n.id !== id));
      toast.success('Заметка удалена');
    } catch (err) {
      console.error('Failed to delete note:', err);
      toast.error('Не удалось удалить заметку');
    }
  }

  function getBookTitle(bookPath: string) {
    const book = getBook(bookPath);
		if (!book) {
			toast.warning('Данная книга не найдена');
			return 'Неизвестная книга';
		} 
    return book?.meta.title;
  }

  function goToBookmark(bookmark: Bookmark) {
		const book = getBook(bookmark.book_path);
		if (!book) {
			toast.warning('Данная книга не найдена');
			return;
		}
    navigate(
			`/book/${book.id}/read?bookmark=${bookmark.id}`,
		);
  }

  function goToNote(note: Note) {
		const book = getBook(note.book_path);
		if (!book) {
			toast.warning("Данная книга не найдена")
			return;
		}
    navigate(`/book/${book.id}/read?chapter=${note.range.start.chapter_id}`);
  }

  // Filtered data
  const filteredBookmarks = createMemo(() => {
    const filter = filterBookId();
    if (!filter) return bookmarks();
    return bookmarks().filter((b) => b.book_path === filter);
  });

  const filteredNotes = createMemo(() => {
    const filter = filterBookId();
    if (!filter) return notes();
		
    return notes().filter((n) => n.book_path === filter);
  });

  // Group by book
  const bookmarksGrouped = createMemo(() => {
    const groups: Record<string, Bookmark[]> = {};
    for (const bm of filteredBookmarks()) {
      if (!groups[bm.book_path]) groups[bm.book_path] = [];
      groups[bm.book_path].push(bm);
    }
    return groups;
  });

  const notesGrouped = createMemo(() => {
    const groups: Record<string, Note[]> = {};
    for (const n of filteredNotes()) {
      if (!groups[n.book_path]) groups[n.book_path] = [];
      groups[n.book_path].push(n);
    }
    return groups;
  });

  return (
			<div class='h-full flex flex-col overflow-hidden'>
				{/* Header */}
				<header class='shrink-0 px-4 py-2 border-b border-border'>
					<div class='flex items-center justify-between gap-4'>
						<div class='flex gap-1 bg-secondary rounded-lg w-fit p-1 h-full'>
							<button
								onClick={() => setActiveTab('bookmarks')}
								class={`
              rounded-lg p-1.5 lg:px-2 sm:px-1.5 text-sm font-medium transition-colors
              ${
															activeTab() === 'bookmarks'
																? 'bg-background shadow-sm'
																: 'hover:bg-secondary-hover/60'
														}
            `}
							>
								<span class='flex items-center gap-2'>
									<Icon name='bookmark' size={17} />
									<span class='max-[600px]:hidden'>Закладки</span>
									<span class='max-[600px]:hidden text-xs w-[17.5px] h-[17.5px] flex justify-center items-center aspect-square rounded-full bg-primary/10 text-primary'>
										{filteredBookmarks().length}
									</span>
								</span>
							</button>
							<button
								onClick={() => setActiveTab('notes')}
								class={`
              p-1.5 rounded-lg lg:px-2 sm:px-1.5 text-sm font-medium transition-colors
              ${
															activeTab() === 'notes'
																? 'bg-background shadow-sm'
																: 'hover:bg-secondary/60'
														}
            `}
							>
								<span class='flex items-center gap-2'>
									<Icon name='documentText' size={17} />
									<span class='max-[600px]:hidden'>Заметки</span>
									<span class='max-[600px]:hidden text-xs w-[17.5px] h-[17.5px] flex justify-center items-center aspect-square rounded-full bg-primary/10 text-primary'>
										{filteredNotes().length}
									</span>
								</span>
							</button>
						</div>

						{/* Filter by book */}
						<Select
							class='w-full'
							onChange={e => setFilterBookId(e || null)}
							value={filterBookId() ?? ''}
							options={[
								{ label: 'Все книги', value: '' },
								...books().map(book => ({
									label: book.meta.title,
									value: book.meta.path,
								})),
							]}
						/>
					</div>

					{/* Tabs */}
				</header>

				{/* Content */}
				<div class='flex-1 overflow-y-auto p-6'>
					<BookLoader loading={isLoading} size={56} />

					{/* Bookmarks tab */}
					<Show when={!isLoading() && activeTab() === 'bookmarks'}>
						<Show
							when={filteredBookmarks().length > 0}
							fallback={
								<EmptyState
									icon='bookmark'
									message='Нет закладок'
									description='Добавляйте закладки при чтении книг нажатием клавиши B'
								/>
							}
						>
							<div class='space-y-6'>
								<For each={Object.entries(bookmarksGrouped())}>
									{([bookPath, bms]) => (
										<div class='animate-fade-in'>
											<h2 class='text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2'>
												<Icon name='book' size={16} />
												{getBookTitle(bookPath)}
											</h2>
											<GlassPanel padding='none' rounded='xl' class='overflow-hidden'>
												<div class='divide-y divide-border overflow-hidden'>
													<For each={bms}>
														{bookmark => (
															<div class='flex items-start verflow-hidden gap-3 p-2 px-4 hover:bg-secondary-hover/60 transition-colors'>
																<Icon
																	name='bookmarkSolid'
																	size={18}
																	class='text-primary mt-0.5 shrink-0'
																/>
																<div class='flex-1 min-w-0'>
																	<p class='text-sm line-clamp-2'>{bookmark.preview}</p>
																	<p class='text-xs text-muted-foreground mt-1'>
																		{new Date(bookmark.created_at).toLocaleDateString()}
																	</p>
																</div>
																<div class='flex gap-1 shrink-0'>
																	<GlassButton
																		size='icon'
																		variant='ghost'
																		onClick={() => goToBookmark(bookmark)}
																		title='Перейти'
																	>
																		<Icon name='chevronRight' size={16} />
																	</GlassButton>
																	<GlassButton
																		size='icon'
																		variant='ghost'
																		onClick={() => handleDeleteBookmark(bookmark.id)}
																		title='Удалить'
																	>
																		<Icon name='trash' size={16} />
																	</GlassButton>
																</div>
															</div>
														)}
													</For>
												</div>
											</GlassPanel>
										</div>
									)}
								</For>
							</div>
						</Show>
					</Show>

					{/* Notes tab */}
					<Show when={!isLoading() && activeTab() === 'notes'}>
						<Show
							when={filteredNotes().length > 0}
							fallback={
								<EmptyState
									icon='documentText'
									message='Нет заметок'
									description='Выделяйте текст и добавляйте заметки при чтении'
								/>
							}
						>
							<div class='space-y-6'>
								<For each={Object.entries(notesGrouped())}>
									{([bookId, ns]) => (
										<div class='animate-fade-in'>
											<h2 class='text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2'>
												<Icon name='book' size={16} />
												{getBookTitle(bookId)}
											</h2>
											<GlassPanel padding='none' rounded='xl' class='overflow-hidden'>
												<div class='divide-y divide-border overflow-hidden'>
													<For each={ns}>
														{note => (
															<div class='p-2 px-4 hover:bg-secondary-hover/60 transition-colors'>
																<div class='flex items-start gap-3'>
																	<div
																		class='w-1 h-full rounded-full shrink-0'
																		style={{
																			background: note.highlight_color ?? 'hsl(var(--primary))',
																		}}
																	/>
																	<div class='flex-1 min-w-0'>
																		<p class='text-sm'>{note.text}</p>
																		<p class='text-xs text-muted-foreground mt-2'>
																			{new Date(note.created_at).toLocaleDateString()}
																		</p>
																	</div>
																	<div class='flex gap-1 shrink-0'>
																		<GlassButton
																			size='icon'
																			variant='ghost'
																			onClick={() => goToNote(note)}
																			title='Перейти'
																		>
																			<Icon name='chevronRight' size={16} />
																		</GlassButton>
																		<GlassButton
																			size='icon'
																			variant='ghost'
																			title='Редактировать'
																		>
																			<Icon name='edit' size={16} />
																		</GlassButton>
																		<GlassButton
																			size='icon'
																			variant='ghost'
																			onClick={() => handleDeleteNote(note.id)}
																			title='Удалить'
																		>
																			<Icon name='trash' size={16} />
																		</GlassButton>
																	</div>
																</div>
															</div>
														)}
													</For>
												</div>
											</GlassPanel>
										</div>
									)}
								</For>
							</div>
						</Show>
					</Show>
				</div>
			</div>
		);
}

function EmptyState(props: { icon: 'bookmark' | 'documentText'; message: string; description: string }) {
  return (
    <div class="flex flex-col items-center justify-center h-64 gap-3">
      <Icon name={props.icon} size={48} class="text-muted-foreground" />
      <p class="font-medium">{props.message}</p>
      <p class="text-sm text-muted-foreground">{props.description}</p>
    </div>
  );
}

