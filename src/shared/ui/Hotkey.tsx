import { For } from "solid-js";

export function Hotkey(props: { label: string; keys: string[] }) {
	return (
		<div class='flex items-center justify-between'>
			<span class='text-sm'>{props.label}</span>
			<div class='flex gap-1'>
				<For each={props.keys}>
					{key => (
						<kbd class='px-2 py-1 text-xs font-mono rounded bg-secondary-hover/60 border border-border'>
							{key}
						</kbd>
					)}
				</For>
			</div>
		</div>
	);
}
