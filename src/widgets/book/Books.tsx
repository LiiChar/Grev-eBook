import { open } from "@tauri-apps/plugin-dialog";
import { BookList } from "../../components/book/BookList";
import Button from "../../shared/ui/Button";
import Modal from "../../shared/ui/Modal";
import { toast } from "../../shared/stores/toastStore";
import { addBooks, getBooks } from "../../shared/api/book";
import { mergeBooksById } from "../../shared/stores/readerStore";
import { createSignal, onMount } from "solid-js";
import { Book } from "../../shared/types/book";

export const Books = () => {
	const [books, setBooks] = createSignal<Book[]>([]);
	const [isModalOpen, setIsModalOpen] = createSignal(false);

	onMount(() => {
		getBooks()
			.then(data => {
				
				if (data.length === 0) {
					setIsModalOpen(true);
				} else {
					setBooks(data);
				}
			})
			.catch(err => {
				console.error('Failed to load books', err);
				toast.error('Не удалось загрузить библиотеку');
				setBooks([]);
				setIsModalOpen(true);
			});
	});

	const handleModalButton = async () => {
		const file = await open({ directory: true });
		if (!file) return toast.warning('Не удалось выбрать каталог');

		try {
			const newBooks = await addBooks(file);
			console.log(newBooks);
			setBooks(prev => mergeBooksById(prev, newBooks));
			setIsModalOpen(false);
		} catch (err) {
			toast.error('Ошибка при добавлении книг');
		}
	};

	return (
		<div class=''>
      {books().length === 0 && <div class='text-center'>Нет книг</div>}
			<Modal
				isOpen={isModalOpen()}
				onClose={() => setIsModalOpen(false)}
			>
				<Button class='btn btn-primary' onClick={handleModalButton}>
					Загрузить книги
				</Button>
			</Modal>
			{books().length > 0 && <BookList books={books()} />}
		</div>
	);
};
