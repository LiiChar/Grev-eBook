/**
 * Хук полноэкранного режима.
 * Вынесен из BookRead.tsx.
 */

import { createSignal } from 'solid-js';

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = createSignal(false);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }

  return { isFullscreen, toggleFullscreen };
}
