import Modal from '@/shared/ui/Modal';
import { createSignal, onMount, onCleanup } from 'solid-js';
import { toast } from 'solid-sonner';

export type ReaderFrameProps = {
	contentRef: () => HTMLDivElement | undefined;
};
export const ReaderIframe = (props: ReaderFrameProps) => {
	const [frame, setFrame] = createSignal<string | null>(null);

	const handleClick = (e: MouseEvent) => {
		const target = e.target as HTMLElement;

		const link = target.closest('a');

		if (!link) return;

		const href = link.getAttribute('href');

		if (!href) return;

		// Внутренние якоря оставляем книге
		if (href.startsWith('#')) return;

		// Блокируем опасные ссылки
		if (
			href.startsWith('javascript:') ||
			href.startsWith('data:') ||
			href.startsWith('file:')
		) {
			toast.error('Невозможно открыть ссылку');
			return;
		}

		let url: URL;

		try {
			url = new URL(href);
		} catch {
			toast.error('Некорректная ссылка');
			return;
		}

		e.preventDefault();
		e.stopPropagation();

		setFrame(url.href);
	};

	onMount(() => {
		document.addEventListener('click', handleClick);

		onCleanup(() => {
			document.removeEventListener('click', handleClick);
		});
	});

	return (
		<Modal isOpen={!!frame()} onClose={() => setFrame(null)} size='lg'>
			<iframe
				src={frame() ?? ''}
				class='w-full h-full border-0'
				loading='eager'
				referrerPolicy='strict-origin-when-cross-origin'
				sandbox='allow-same-origin allow-scripts allow-forms allow-popups'
			/>
		</Modal>
	);
};
