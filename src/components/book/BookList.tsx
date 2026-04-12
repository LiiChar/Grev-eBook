import { For } from "solid-js";
import { BookWithoutChapters } from "../../shared/types/book";
import { BookElement } from "./BookElement";

type BookListProps = {
	books: BookWithoutChapters[];
};

export const BookList = ({books}: BookListProps) => {
	return (
		<div class='flex flex-col gap-1 p-2'>
			<For each={books} fallback={<div>Loading...</div>}>
				{b => <BookElement link={`/book/${b.id}`} class='w-1/4 aspect-12/16' book={b} />}
			</For>
		</div>
	);
};
