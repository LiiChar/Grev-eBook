import { useNavigate, useParams } from '@solidjs/router';
import { createSignal, onMount, Show, createMemo, batch } from 'solid-js';
import { BookPageParams } from '../../shared/types/router';
import { Book as BookType } from '../../shared/types/book';
import { openBook } from '../../shared/api/book';
import { CoverImage } from '../../shared/ui/CoverImage';
import { toast } from 'solid-sonner';

export const Book = () => {
	const { id } = useParams<BookPageParams>();
	const [book, setBook] = createSignal<BookType | undefined>();
	const [isLoading, setIsLoading] = createSignal(true);

	console.log('Book', id);

	// Состояние прогресса и заметок (в реальном приложении — из хранилища)
	const [readProgress, setReadProgress] = createSignal(0);
	const [notes, setNotes] = createSignal('');
  const navigate = useNavigate();

	onMount(async () => {
		setIsLoading(true);
		try {
			console.log('addBook', id);
			const data = await openBook(id);
			batch(() => {
				setBook(data);
				// Загружаем прогресс и заметки из localStorage (замените на store.json позже)
				const savedProgress = localStorage.getItem(`book:${id}:progress`);
				const savedNotes = localStorage.getItem(`book:${id}:notes`) || '';
				if (savedProgress) setReadProgress(Number(savedProgress));
				setNotes(savedNotes);
			});
		} catch (err) {
			console.error('Failed to load book', err);
			toast.error('Не удалось загрузить книгу');
		} finally {
			setIsLoading(false);
		}
	});

	const handleSaveNotes = () => {
		localStorage.setItem(`book:${id}:notes`, notes());
		toast.success('Заметки сохранены');
	};

	const handleStartReading = () => {
		navigate(`/book/${id}/read`);
	};

	const sortedChapters = createMemo(() =>
		[...(book()?.chapters || [])].sort((a, b) => a.order - b.order)
	);

	return (
		<div class='max-w-5xl mx-auto p-4 md:p-6 h-full'>
			<Show
				when={!isLoading() && book()}
				fallback={
					<div class='flex flex-col items-center justify-center h-96'>
						<span class='loading loading-spinner loading-lg text-primary'></span>
						<p class='mt-4 text-gray-500'>Загрузка книги...</p>
					</div>
				}
			>
				<div class='grid grid-cols-1  md:grid-cols-3 gap-6 md:gap-8'>
					{/* Обложка */}
					<div class='md:col-span-1 max-h-screen flex items-center justify-center'>
						<div class='bg-base-200 h-full rounded-2xl overflow-hidden shadow-xl aspect-10/16 flex items-center justify-center border border-base-300'>
							<Show when={book()?.id && book()?.meta?.path}>
								<CoverImage
									bookId={book()!.id}
									bookPath={book()!.meta.path}
									alt={book()!.meta.title}
									class='w-full h-full object-cover'
								>
									<div class='text-gray-500 text-center p-6 text-lg font-medium'>
										Нет обложки
									</div>
								</CoverImage>
							</Show>
						</div>
					</div>

					{/* Основной контент */}
					<div class='md:col-span-2 flex flex-col gap-6'>
						{/* Заголовок и метаданные */}
						<div>
							<h1 class='text-2xl md:text-3xl font-bold text-base-content leading-tight'>
								{book()!.meta.title}
							</h1>
							{book()!.meta.author && (
								<p class='text-lg text-gray-600 dark:text-gray-400 mt-2'>
									{book()!.meta.author}
								</p>
							)}
							<div class='flex flex-wrap gap-2 mt-3'>
								{book()!.meta.language && (
									<span class='badge badge-outline'>
										{book()!.meta.language}
									</span>
								)}
								<span class='badge badge-ghost'>
									{book()!.chapters.length} глав
								</span>
							</div>
						</div>

						{/* Прогресс чтения */}
						<div class='card bg-base-100 p-4 rounded-xl'>
							<div class='flex justify-between items-center mb-2'>
								<h3 class='font-semibold'>Ваш прогресс</h3>
								<span class='text-sm font-medium text-primary'>
									{readProgress()}%
								</span>
							</div>
							<progress
								class='progress progress-primary w-full'
								value={readProgress()}
								max='100'
							></progress>
						</div>

						{/* Заметки */}
						<div class='card bg-base-100 p-4 rounded-xl'>
							<div class='flex justify-between items-start mb-2'>
								<h3 class='font-semibold'>Заметки</h3>
								<button
									class='btn btn-xs btn-primary'
									onClick={handleSaveNotes}
								>
									Сохранить
								</button>
							</div>
							<textarea
								class='textarea textarea-bordered w-full min-h-[100px] text-sm'
								placeholder='Запишите свои мысли о книге...'
								value={notes()}
								onInput={e => setNotes(e.currentTarget.value)}
							/>
						</div>

						{/* Действия */}
						<div class='flex flex-wrap gap-3 pt-2'>
							<button
								class='btn btn-primary flex-1 min-w-[120px]'
								onClick={handleStartReading}
							>
								Читать
							</button>
							<button class='btn btn-outline flex-1 min-w-[120px]'>
								Экспорт
							</button>
							<button class='btn btn-outline btn-error flex-1 min-w-[120px]'>
								Удалить
							</button>
						</div>
					</div>
				</div>

				{/* Содержание */}
				<div class='mt-10'>
					<h2 class='text-xl font-bold mb-4 pb-2 border-b border-base-200'>
						Содержание
					</h2>
					<ul class='space-y-2'>
						{sortedChapters()
							.slice(0, 24)
							.map(chapter => (
								<li>
									<a
										href={`#${id}/read?chapter=${chapter.id}`}
										class='link link-hover text-base-content hover:text-primary'
									>
										{chapter.title || `Глава ${chapter.order}`}
									</a>
								</li>
							))}
					</ul>
				</div>
			</Show>
		</div>
	);
};
