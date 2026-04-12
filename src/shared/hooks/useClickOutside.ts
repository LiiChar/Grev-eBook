import { createEffect, createSignal, onCleanup, type Accessor } from 'solid-js';

type Target = HTMLElement | Accessor<HTMLElement | null | undefined>;

export function useClickOutside(
	callback: (e: MouseEvent) => void,
	target?: Target,
) {
	// Вариант 1: передали target → просто эффект
	if (target) {
		createEffect(() => {
			const el = typeof target === 'function' ? target() : target;
			if (!el) return;

			const handler = (e: MouseEvent) => {
				if (el && !el.contains(e.target as Node)) {
					callback(e);
				}
			};

			document.addEventListener('mousedown', handler);
			// или 'click' — mousedown чаще используется для предотвращения фокуса

			onCleanup(() => {
				document.removeEventListener('mousedown', handler);
			});
		});

		return;
	}

	// Вариант 2: без target → возвращаем ref + сигнал
	const [ref, setRef] = createSignal<HTMLElement | null>(null);

	createEffect(() => {
		const el = ref();
		if (!el) return;

		const handler = (e: MouseEvent) => {
			if (el && !el.contains(e.target as Node)) {
				callback(e);
			}
		};

		document.addEventListener('mousedown', handler);
		onCleanup(() => document.removeEventListener('mousedown', handler));
	});

	return ref;
}
