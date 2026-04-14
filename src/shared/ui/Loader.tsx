import { Accessor, JSX, Show } from 'solid-js';

type BookLoaderProps = {
	size?: number; color?: string
	loading: Accessor<boolean>;
} & JSX.HTMLAttributes<HTMLDivElement>;

export const BookLoader = ({ class: className, loading, ...attr }: BookLoaderProps) => {
	return (
		<Show when={loading()}>
			<div class='w-full h-full flex justify-center items-center'>
				<div {...attr} class='pinwheel h-10 w-10'>
					<div class='pinwheel__line'></div>
					<div class='pinwheel__line'></div>
					<div class='pinwheel__line'></div>
					<div class='pinwheel__line'></div>
					<div class='pinwheel__line'></div>
					<div class='pinwheel__line'></div>
				</div>
			</div>
		</Show>
	);
};
