/**
 * Хук автоскрытия панелей управления читалки.
 */

import { createSignal, onCleanup } from 'solid-js';
import { settings } from '../../../shared/stores/settingsStore';

export interface UseAutoHideControlsReturn {
	showControls: () => boolean;
	setShowControls: (v: boolean) => void;
	setupAutoHide: (options: {
		showToc: () => boolean;
		showSettings: () => boolean;
	}) => void;
}

export function useAutoHideControls(): UseAutoHideControlsReturn {
	const [showControls, setShowControls] = createSignal(true);

	function setupAutoHide(options: {
		showToc: () => boolean;
		showSettings: () => boolean;
	}): void {
		if (!settings.ui.auto_hide) return;

		setTimeout(() => {
			const scrollEl = document.querySelector('.reader-wrapper');
			if (!scrollEl) return;

			let lastScrollY = scrollEl.scrollTop;
			let hideControlsTimer: number | null = null;

			const isMouseOverControls = () => {
				const hovered = document.querySelector('.reader-control:hover');
				return !!hovered;
			};

			const scheduleHide = () => {
				if (hideControlsTimer) {
					clearTimeout(hideControlsTimer);
				}

				hideControlsTimer = window.setTimeout(() => {
					if (options.showToc() || options.showSettings() || isMouseOverControls()) {
						scheduleHide();
						return;
					}

					setShowControls(false);
				}, 1200);
			};

			const resetTimer = () => {
				setShowControls(true);
				scheduleHide();
			};

			resetTimer();

			const onScroll = () => {
				const currentY = scrollEl.scrollTop;

				if (currentY + 400 < lastScrollY) {
					resetTimer();
					lastScrollY = currentY;
				} else if (currentY < lastScrollY) {
					lastScrollY += 2;
				} else {
					lastScrollY = currentY;
				}
			};

			const onMouseMove = (e: MouseEvent) => {
				const topZone = 44;
				const bottomZone = 48;

				if (
					e.clientY <= topZone ||
					e.clientY >= window.innerHeight - bottomZone ||
					isMouseOverControls()
				) {
					resetTimer();
				}
			};

			const onClick = () => {
				resetTimer();
			};

			scrollEl.addEventListener('scroll', onScroll, { passive: true });
			document.addEventListener('mousemove', onMouseMove);
			document.addEventListener('click', onClick);

			onCleanup(() => {
				scrollEl.removeEventListener('scroll', onScroll);
				document.removeEventListener('mousemove', onMouseMove);
				document.removeEventListener('click', onClick);

				if (hideControlsTimer) {
					clearTimeout(hideControlsTimer);
				}
			});
		}, 100);
	}

	return {
		showControls,
		setShowControls,
		setupAutoHide,
	};
}
