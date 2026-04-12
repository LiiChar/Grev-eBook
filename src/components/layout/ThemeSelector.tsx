import { createSignal, Show } from 'solid-js';

type Theme = 'light' | 'dark' | 'sepia' | 'night';

const THEME_COLORS: Record<Theme, string> = {
	light: '#f8fafc',
	dark: '#020617',
	sepia: '#f4ecd8',
	night: '#020617',
};

export function ThemeSelector(props: {
	value: Theme;
	onChange: (t: Theme) => void;
}) {
	const [wave, setWave] = createSignal<{
		x: number;
		y: number;
		color: string;
	} | null>(null);

	function handleClick(e: MouseEvent, theme: Theme) {
		if (theme === props.value) return;

		// setWave({
		// 	x: e.clientX,
		// 	y: e.clientY,
		// 	color: THEME_COLORS[theme],
		// });

		// Меняем тему в середине волны
		// setTimeout(() => {
			props.onChange(theme);
		// }, 100);
	}

	return (
		<>
			<div class='flex gap-2 flex-wrap w-full'>
				{(['light', 'dark', 'sepia', 'night'] as Theme[]).map(theme => (
					<button
						onClick={e => handleClick(e, theme)}
						class={`
              px-3 py-2 rounded-lg text-xs font-medium
              border transition-all relative z-1
              ${
								props.value === theme
									? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]'
									: 'border-[var(--border)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)]'
							}
            `}
					>
						{theme === 'light' && '☀️ Светлая'}
						{theme === 'dark' && '🌙 Тёмная'}
						{theme === 'sepia' && '📜 Сепия'}
						{theme === 'night' && '🌑 Ночная'}
					</button>
				))}
			</div>

			<Show when={wave()}>
				{w => (
					<div class='theme-wave' onAnimationEnd={() => setWave(null)}>
						<div
							class='theme-wave__circle'
							style={{
								left: `${w().x}px`,
								top: `${w().y}px`,
								'background-color': w().color,
							}}
						/>
					</div>
				)}
			</Show>
		</>
	);
}
