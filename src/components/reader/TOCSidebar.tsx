import { Accessor, For, JSX, Show } from "solid-js";
import { GlassButton } from "../../shared/ui/GlassButton";
import { Icon } from "../../shared/ui/Icon";
import { Chapter } from "../../shared/types/book";
import { reader } from "../../shared/stores/readerStore";
import { useClickOutside } from "../../shared/hooks/useClickOutside";

type TOCSidebarProps = {
	show: Accessor<boolean>;
	setShow: (value: boolean) => void;
	chapters: Accessor<Chapter[]>;
  toChapter: (index: number) => void;
} & JSX.HTMLAttributes<HTMLElement>;

export const TOCSidebar = ({show, chapters, setShow, toChapter, class: className, ...attr}: TOCSidebarProps) => {
  	const ref = useClickOutside(() => setShow(false));
	return (
		<Show when={show()}>
			<aside ref={ref} {...attr} class={'absolute left-1 top-13 rounded-lg bottom-2 w-64 z-20 backdrop-blur-md border-r border-[var(--border)] animate-slide-in-left ' + className}>
				<div class='h-full flex flex-col'>
					<div class='p-3 border-b border-(--border) flex items-center justify-between'>
						<h2 class='font-semibold text-sm'>Содержание</h2>
						<GlassButton
							size='icon'
							variant='ghost'
							onClick={() => setShow(false)}
						>
							<Icon name='x' size={16} />
						</GlassButton>
					</div>
					<div class='flex-1 overflow-y-auto'>
						<For each={chapters()}>
							{(chapter, index) => (
								<button
									onClick={() => toChapter(index())}
									class={`
                          w-full text-left px-4 py-2 text-sm border-b border-[var(--border)]
                          hover:bg-[var(--surface-hover)] transition-colors
                          ${index() === reader.currentIndex ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : ''}
                        `}
								>
									{chapter.title || `Глава ${chapter.order + 1}`}
								</button>
							)}
						</For>
					</div>
				</div>
			</aside>
		</Show>
	);
};