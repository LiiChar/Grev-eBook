import { createSignal, Show } from "solid-js";
import { GlassButton } from "../../shared/ui/GlassButton";
import { Icon } from "../../shared/ui/Icon";
import { useClickOutside } from "../../shared/hooks/useClickOutside";

type AddMenuProps = {
	onAddFile: () => void;
	onAddFolder: () => void;
};

export const AddMenu = (props: AddMenuProps) => {
	const [isOpen, setIsOpen] = createSignal(false);
	let rootEl: HTMLElement | undefined;

	useClickOutside(() => {
		if (!isOpen()) return;
		setIsOpen(false);
	}, () => rootEl);

	return (
		<div class='relative' ref={el => (rootEl = el)}>
			{/* Desktop / wide screens */}
			<div class='hidden lg:flex items-center gap-2'>
				<GlassButton onClick={props.onAddFile} size='sm'>
					<Icon name='plus' size={16} />
					Файл
				</GlassButton>
				<GlassButton onClick={props.onAddFolder} variant='primary' size='sm'>
					<Icon name='folder' size={16} />
					Папка
				</GlassButton>
			</div>

			{/* Mobile / narrow screens */}
			<div class='lg:hidden'>
				<button
					type='button'
					class='p-2 rounded-lg hover:bg-(--surface) transition-colors'
					aria-label='Добавить'
					onClick={() => setIsOpen(prev => !prev)}
				>
					<Icon name='plus' size={18} />
				</button>
				<Show when={isOpen()}>
					<div class='absolute right-0 top-full mt-2 z-20'>
						<div class='flex flex-col gap-2 p-2 rounded-lg border border-(--border) bg-(--background)'>
							<GlassButton onClick={props.onAddFile} size='sm'>
								<Icon name='plus' size={16} />
								Файл
							</GlassButton>
							<GlassButton onClick={props.onAddFolder} variant='primary' size='sm'>
								<Icon name='folder' size={16} />
								Папка
							</GlassButton>
						</div>
					</div>
				</Show>
			</div>
		</div>
	);
};
