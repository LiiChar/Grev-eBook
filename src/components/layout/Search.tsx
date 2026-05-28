import { createSignal, Show } from "solid-js";
import { Icon } from "../../shared/ui/Icon";

type SearchProps = {
	searchQuery: string;
	setSearchQuery: (query: string) => void;
};

export const Search = ({ searchQuery, setSearchQuery }: SearchProps) => {
	const [isOpen, setIsOpen] = createSignal(false);

	return (
		<div class='relative'>
			{/* Desktop / wide screens */}
			<div class='hidden md:block'>
				<Icon
					name='search'
					size={16}
					class='absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground'
				/>
				<input
					type='text'
					placeholder='Поиск...'
					value={searchQuery}
					onInput={e => setSearchQuery(e.currentTarget.value)}
					class='pl-8! pr-4 py-2 w-64 rounded-lg! text-sm'
				/>
			</div>

			{/* Mobile / narrow screens */}
			<div class='md:hidden'>
				<button
					type='button'
					class='p-2 rounded-lg hover:bg-secondary transition-colors'
					aria-label='Поиск'
					onClick={() => setIsOpen(prev => !prev)}
				>
					<Icon name='search' size={18} />
				</button>
				<Show when={isOpen()}>
					<div class='absolute left-0 top-full mt-2 z-20'>
						<div class='relative'>
							<Icon
								name='search'
								size={16}
								class='absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground'
							/>
							<input
								type='text'
								placeholder='Поиск...'
								value={searchQuery}
								onInput={e => setSearchQuery(e.currentTarget.value)}
								class='pl-8! pr-4 py-2 w-64 rounded-lg text-sm border border-border backdrop-blur-lg'
							/>
						</div>
					</div>
				</Show>
			</div>
		</div>
	);
};
