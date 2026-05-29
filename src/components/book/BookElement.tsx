// src/components/book/BookElement.tsx
import { JSX, createSignal } from 'solid-js';
import { BookWithoutChapters } from '../../shared/types/book';
import { useNavigate } from '@solidjs/router';
import { CoverImage } from '../../shared/ui/CoverImage';

export type BookElementProps = {
	book: BookWithoutChapters;
	link?: string;
} & JSX.HTMLAttributes<HTMLDivElement>;

export const BookElement = (props: BookElementProps) => {
	const {
		book,
		style,
		onClick,
		link,
		class: className,
		...rest
	} = props;

	 const navigate = useNavigate();

	const [showActions, setShowActions] = createSignal(false);

	return (
		<div
			{...rest}
			class={`group relative card flex flex-col justify-between items-end p-2  bg-secondary shadow-md rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 ${
				className || 'w-full'
			}`}
			onClick={(e) => {
				link && navigate(link);
				onClick && (onClick as any)(e);
			}}
			style={style}
		>
			<figure class=' w-full h-full z-1 absolute top-0 left-0 flex items-center justify-center'>
				<CoverImage
					bookId={book.id}
					bookPath={book.meta.path}
					alt={book.meta.title || 'Обложка книги'}
					class='object-cover w-full h-full'
				>
					<div class='text-gray-400 text-sm'>Нет обложки</div>
				</CoverImage>
			</figure>
			<div></div>

			<div class='relative z-2 text-shadow-md'>
				<div>
					{book.meta.author && (
						<p class='text-xs text-gray-500 mt-1'>Автор: {book.meta.author}</p>
					)}
				</div>
				<h3 class='card-title text-white text-sm font-bold line-clamp-2'>
					{book.meta.title || 'Без названия'}
				</h3>
			</div>
		</div>
	);
};
