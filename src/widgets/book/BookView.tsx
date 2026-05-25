import { createSignal, onMount } from "solid-js";
import { VirtualListBook } from "../../components/book/VirtualListBook"
import { addBook, getBook, openBook } from "../../shared/api/book";
import { useParams } from "@solidjs/router";
import { BookPageParams } from "../../shared/types/router";
import { Book, Chapter } from "../../shared/types/book";
import { toast } from "../../shared/stores/toastStore";
import { reader } from "../../shared/stores/readerStore";

export  const BookView = () => {
		const { id } = useParams<BookPageParams>();
	const [chapters, setChapters] = createSignal<Chapter[]>([]);
	// const [isModalOpen, setIsModalOpen] = createSignal(false);

	// const handleModalButton = async () => {
	// 	const file = await open({ directory: false, multiple: false, filters: [{ name: 'Books', extensions: ['epub', 'pdf', 'mobi', 'txt'] }] });
	// 	if (!file) return toast.warning('Не удалось выбрать каталог');

	// 	try {
	// 		const newBook = await addBook(file);
	// 		console.log(newBook);
	// 		setBook(newBook);
	// 		setIsModalOpen(false);
	// 	} catch (err) {
	// 		toast.error('Ошибка при добавлении книг');
	// 	}
	// };

	onMount(() => {
		if (reader.bookId == id) {
			if (reader.chapters.length > 0) {
				setChapters(reader.chapters);
				return;
			}
		}
		openBook(id)
			.then(data => {
				setChapters(data?.chapters ?? []);
				if (!data) {
					console.log('open modal');
					
					// setIsModalOpen(true);
				}
			})
			.catch(err => {
				console.error('Failed to load books', err);
				toast.error('Не удалось загрузить книгу');
				setChapters([]);
				// setIsModalOpen(true);
			});
	});

	return (
		<>
			{/* <Modal isOpen={isModalOpen()} onClose={() => setIsModalOpen(false)}>
				<Button class='btn btn-primary' onClick={handleModalButton}>
					Загрузить книги
				</Button>
			</Modal> */}
			{chapters() && (
				<VirtualListBook chapters={chapters()} bookId={id} />
			)}
		</>
	);
}