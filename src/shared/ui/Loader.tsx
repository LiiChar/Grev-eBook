import { Accessor, JSX, Show } from 'solid-js';
import { Icon } from './Icon';

type BookLoaderProps = {
	size?: number; color?: string
	loading: Accessor<boolean>;
} & JSX.HTMLAttributes<HTMLDivElement>;

export const BookLoader = ({ class: className, loading, ...attr }: BookLoaderProps) => {
	return (
		<Show when={loading()}>
			<div
				{...attr}
				class={'flex-1 h-full w-full flex items-center justify-center ' + className}
			>
				<div class='animate-spin'>
					<Icon name='book' size={32} class='text-(--primary)' />
				</div>
			</div>
		</Show>
	);
};
