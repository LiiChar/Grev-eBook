import type { Chapter as ChapterType } from '../../shared/types/book';
import { Virtualizer, VirtualizerHandle } from 'virtua/solid';
import { Chapter } from './Chapter';
import { toast } from '../../shared/stores/toastStore';
import { onMount } from 'solid-js';

export function VirtualListBook({chapters}: {
	chapters: ChapterType[];
	bookId?: string;
}) {


	let ref: VirtualizerHandle | undefined;

		const scrollTo = (index: number) => {
			if (!ref) return toast.warning("Возникла ошибка при скролле к прочитанному")
			ref.scrollToIndex(index, {
				align: 'start',
				smooth: false,
			});
		};

		onMount(() => {
			const index = localStorage.getItem('read_index');
			toast.info('Переход к индексу ' + index);
			setTimeout(() => {
				if (index) scrollTo(+index);
			}, 0)
		})


	return (
		<div
			class='reader-scroll reader overflow-y-auto p-0! m-0! h-[calc(100vh-40px)]! max-w-screen!'
			style='contain: strict'
		>
			<Virtualizer data={chapters} ref={r => (ref = r)}>
				{(d, i) => (
					<div
						onClick={() => {
							toast.warning('Сохранение индекса ' + i());
							localStorage.setItem('read_index', `${i()}`);
						}}
						style={{
							height: d + 'px',
						}}
						class='flex items-center flex-col'
					>
						<Chapter class='container-reader' chapter={d} />
					</div>
				)}
			</Virtualizer>
		</div>
	);
}
