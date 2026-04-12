import { createSignal, onMount, For, Show, createMemo, JSX } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { open } from "@tauri-apps/plugin-dialog";
import { getBooks, addBooks, addBook, clearStore } from "../../shared/api/book";
import { toast } from "../../shared/stores/toastStore";
import { GlassButton } from "../../shared/ui/GlassButton";
import { Icon } from "../../shared/ui/Icon";
import { Search } from "../../components/layout/Search";
import { AddMenu } from "../../components/layout/AddMenu";
import { Select } from "../../shared/ui/Select";
import { BookCard, BookCardGrid, BookCardList } from "../../components/book/BookCard";
import { BookLoader } from "../../shared/ui/Loader";
import { reader, setReader } from "../../shared/stores/readerStore";

type SortKey = "title" | "author" | "recent";

export function LibraryPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = createSignal(true);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [sortKey, setSortKey] = createSignal<SortKey>("title");
  const [viewMode, setViewMode] = createSignal<"grid" | "list">("grid");

  onMount(async () => {
    await loadBooks();
  });

  async function loadBooks() {
    setIsLoading(true);
    try {
      if (reader.books.length == 0) {
        const data = await getBooks();
        setReader({ books: data });
      }
    } catch (err) {
      console.error("Failed to load books:", err);
      toast.error("Не удалось загрузить библиотеку");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddFolder() {
    const folder = await open({ directory: true });
    if (!folder) return;

    try {
      const newBooks = await addBooks(folder);
      setReader({ books: newBooks });
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
      await loadBooks();
      toast.success("Книга добавлена");
    } catch (err) {
      console.error("Failed to add book:", err);
      toast.error("Ошибка при добавлении книги");
    }
  }

  const filteredBooks = createMemo(() => {
    let result = [...reader.books];

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
        result.sort((a, b) => a.meta.title.localeCompare(b.meta.title));
        break;
      case "author":
        result.sort((a, b) =>
          (a.meta.author ?? "").localeCompare(b.meta.author ?? ""),
        );
        break;
      case "recent":
        // Keep original order (most recent additions last in array)
        result.reverse();
        break;
    }

    return result;
  });

  return (
		<div class='h-full flex flex-col overflow-hidden'>
			{/* Header */}
			<header
				data-tauri-drag-region
				class='shrink-0 px-6 py-4 border-b border-(--border) bg-(--background)'
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
						<AddMenu onAddFile={handleAddFile} onAddFolder={handleAddFolder} />
						</div>

						{/* Add buttons */}
					</div>
				</div>
			</header>

			{/* Content */}
			<div class='flex-1 overflow-y-auto p-6'>
				<BookLoader loading={isLoading} />

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
					<div
						class={
							viewMode() === 'grid'
								? 'grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4'
								: 'flex flex-col gap-2'
						}
					>
						<For each={filteredBooks()}>
							{(book, index) => (
								<BookCard
									viewMode={viewMode}
									book={book}
									index={index()}
									onClick={() => navigate(`/book/${book.id}`)}
								/>
							)}
						</For>
					</div>
				</Show>
			</div>
		</div>
	);
}
