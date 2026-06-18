import { setPdfZoom, setPdfZoomLock, settings } from "@/shared/stores/settingsStore";
import { getFileExtension } from "@/shared/utils/file";
import { createEffect, createMemo, For, onCleanup, onMount, Show } from "solid-js";
import { ContentChapterTypeProps, ReaderContentProps } from "../ReaderContent";
import { reader } from "@/shared/stores/readerStore";

export function ReaderContentPDF(props: ReaderContentProps) {
	const sortedChapters = createMemo(() => {
		return props.book.chapters?.toSorted((a, b) => a.order - b.order) ?? [];
	});

	const currentChapter = createMemo(
		() => sortedChapters()[reader.currentIndex],
	);

	return (
		<div
			ref={props.contentRef}
			class='flex-1 overflow-y-auto reader-wrapper scroll-smooth pt-11'
			onScroll={props.onScroll}
		>
			<article
				data-type={getFileExtension(props.book.meta.path)}
				lang={props.book.meta.language}
				class='reader mx-auto px-6 py-8 overflow-x-auto'
				style={{
					'max-width': `${settings.reader.column_width}px`,
					'font-size': `${settings.reader.font_size}px`,
					'line-height': settings.reader.line_height,
				}}
			>
				<Show when={settings.reader.mode === 'scroll'}>
					<For each={sortedChapters()}>
						{(chapter, index) => (
							<div id={`chapter-${index()}`}>
								<ContentChapterPDF chapter={chapter} />
							</div>
						)}
					</For>
				</Show>

				{/* Chapter mode */}
				<Show when={settings.reader.mode === 'chapters' && currentChapter()}>
					<Show when={currentChapter()?.title}>
						<h1 class='text-xl font-semibold mb-6 text-center'>
							{currentChapter()!.title}
						</h1>
					</Show>
					<div class='animate-fade-in mb-3'>
						<ContentChapterPDF chapter={currentChapter()!} />
					</div>
				</Show>
			</article>
		</div>
	);
}

export function ContentChapterPDF(props: ContentChapterTypeProps) {
	let ref!: HTMLDivElement;
	let observer: ResizeObserver | undefined;

	let currentScale = 1;
	let isPinching = false;
	let initialDistance = 0;
	let startScale = 1;

	const updatePdfScale = () => {
		const page = ref.querySelector<HTMLDivElement>('#page0');
		if (!page) return;

		const pdfWidth = Number(page.getAttribute('pdf-width'));
		const pdfHeight = Number(page.getAttribute('pdf-height'));
		if (!pdfWidth || !pdfHeight) return;

		const containerWidth = ref.clientWidth || ref.parentElement?.clientWidth || 0;
		if (!containerWidth) return;

		const zoom = settings.reader.pdf_zoom ?? 1;
		const fitScale = containerWidth / pdfWidth;
		const scale = settings.reader.pdf_zoom_lock ? zoom : fitScale * zoom;

		page.style.transformOrigin = 'top left';
		page.style.margin = '0px';
		page.style.willChange = 'transform';
		page.style.display = 'inline-block';
		page.style.width = `${pdfWidth}px`;
		page.style.height = `${pdfHeight}px`;
		// preserve container center when scaling
		const pageW = page.clientWidth || pdfWidth;
		const pageH = page.clientHeight || pdfHeight;
		const prevScale = currentScale || 1;
		const container = ref;
		const relCenterX =
			(container.scrollLeft + container.clientWidth / 2) / (pageW * prevScale);
		const relCenterY =
			(container.scrollTop + container.clientHeight / 2) / (pageH * prevScale);

		page.style.transform = `scale(${scale})`;

		ref.style.height = `${pdfHeight * scale}px`;
		ref.style.width = settings.reader.pdf_zoom_lock
			? `${pdfWidth * scale}px`
			: '100%';
		currentScale = scale;

		// adjust scroll to keep same relative center
		const newScrollLeft = Math.max(
			0,
			relCenterX * pageW * scale - container.clientWidth / 2,
		);
		const newScrollTop = Math.max(
			0,
			relCenterY * pageH * scale - container.clientHeight / 2,
		);
		container.scrollLeft = Math.min(
			newScrollLeft,
			Math.max(0, pageW * scale - container.clientWidth),
		);
		container.scrollTop = Math.min(
			newScrollTop,
			Math.max(0, pageH * scale - container.clientHeight),
		);
	};

	createEffect(() => {
		// explicitly read settings here so Solid tracks these dependencies
		const _zoom = settings.reader.pdf_zoom;
		const _lock = settings.reader.pdf_zoom_lock;
		_zoom;
		_lock;
		updatePdfScale();
	});

	onMount(() => {
		ref.innerHTML = props.chapter.html.replaceAll(
			'.chapter',
			`div.chapter-pdf[data-chapter-id="${props.chapter.id}"]`,
		);

		// inject CSS to hide scrollbars but keep scrolling behaviour
		if (!document.getElementById('chapter-pdf-hide-scrollbar')) {
			const style = document.createElement('style');
			style.id = 'chapter-pdf-hide-scrollbar';
			style.textContent = `
			.chapter-pdf { -ms-overflow-style: none; scrollbar-width: none; }
			.chapter-pdf::-webkit-scrollbar { display: none; }
			`;
			document.head.appendChild(style);
		}

		if (observer) {
			observer.disconnect();
		}

		observer = new ResizeObserver(() => {
			requestAnimationFrame(updatePdfScale);
		});
		observer.observe(ref);
		queueMicrotask(updatePdfScale);
		// ensure chapter itself does not scroll internally
		ref.style.overflow = 'hidden';

		// Touch pinch handlers
		const getDistance = (t1: Touch, t2: Touch) => {
			const dx = t2.clientX - t1.clientX;
			const dy = t2.clientY - t1.clientY;
			return Math.hypot(dx, dy);
		};

		const onTouchStart = (e: TouchEvent) => {
			if (e.touches.length === 2) {
				e.preventDefault();
				isPinching = true;
				initialDistance = getDistance(e.touches[0], e.touches[1]);
				startScale = currentScale;
			}
		};

		const onTouchMove = (e: TouchEvent) => {
			if (!isPinching || e.touches.length < 2) return;
			e.preventDefault();
			const dist = getDistance(e.touches[0], e.touches[1]);
			const factor = dist / (initialDistance || dist);
			// compute fitScale to normalize relative zoom
			const page = ref.querySelector<HTMLDivElement>('#page0');
			if (!page) return;
			const pdfWidth = Number(page.getAttribute('pdf-width')) || 1;
			const containerWidth =
				ref.clientWidth || ref.parentElement?.clientWidth || 1;
			let newScale = Math.max(0.5, Math.min(3, startScale * factor));
			page.style.transform = `scale(${newScale})`;
			ref.style.height = `${(Number(page.getAttribute('pdf-height')) || 0) * newScale}px`;
			currentScale = newScale;
		};

		const onTouchEnd = (e: TouchEvent) => {
			if (!isPinching) return;
			if (e.touches.length < 2) {
				isPinching = false;
				// persist zoom relative to fitScale
				const page = ref.querySelector<HTMLDivElement>('#page0');
				if (!page) return;
				const pdfWidth = Number(page.getAttribute('pdf-width')) || 1;
				const fitScale =
					(ref.clientWidth || ref.parentElement?.clientWidth || 1) / pdfWidth;
				const zoomValue = currentScale / fitScale;
				setPdfZoom(zoomValue);
			}
		};

		ref.addEventListener('touchstart', onTouchStart, { passive: false } as any);
		ref.addEventListener('touchmove', onTouchMove, { passive: false } as any);
		ref.addEventListener('touchend', onTouchEnd, { passive: false } as any);

		// lock button toggle
		const onLockClick = (e: Event) => {
			e.stopPropagation();
			const newLock = !settings.reader.pdf_zoom_lock;
			setPdfZoomLock(newLock);
			if (newLock) {
				// when locking, persist current scale as zoom
				const page = ref.querySelector<HTMLDivElement>('#page0');
				if (page) {
					const pdfWidth = Number(page.getAttribute('pdf-width')) || 1;
					const fitScale =
						(ref.clientWidth || ref.parentElement?.clientWidth || 1) / pdfWidth;
					setPdfZoom(currentScale / fitScale);
				}
			}
		};

		// toggle horizontal overflow when lock changes
		createEffect(() => {
			if (!ref) return;
			ref.style.overflowX = settings.reader.pdf_zoom_lock ? 'hidden' : 'auto';
		});

		onCleanup(() => {
			ref.removeEventListener('touchstart', onTouchStart as any);
			ref.removeEventListener('touchmove', onTouchMove as any);
			ref.removeEventListener('touchend', onTouchEnd as any);
		});
	});

	onCleanup(() => {
		observer?.disconnect();
	});

	return (
		<div
			class='chapter-pdf animate-fade-in overflow-hidden'
			data-chapter-id={props.chapter.id}
			ref={ref}
		/>
	);
}