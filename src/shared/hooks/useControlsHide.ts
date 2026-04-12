import { onCleanup, onMount } from "solid-js";

type useControlsHideParams = {
	target: HTMLElement;
	onShow: (v: boolean) => void;
	opt: UseControlsHideOptions;
};

type UseControlsHideOptions = {
	disable?: boolean;
	checkHide?: () => boolean;
};

export const useControlsHide = (
	target: HTMLElement,
	onShow: useControlsHideParams['onShow'],
	opt: useControlsHideParams['opt'] = {},
) => {
  let hideControlsTimeout: ReturnType<typeof setTimeout> | null = null;

  onMount(() => {
    if (opt.disable) return;

    // Ждем рендеринга контента
    setTimeout(() => {
      const scrollEl = document.querySelector('.reader-wrapper');
      if (!scrollEl) {
        console.warn('Reader wrapper not found for controls auto-hide');
        return;
      }

      let lastScrollY = scrollEl.scrollTop;
      let hideControlsTimer: number | null = null;

      const resetTimer = () => {
        onShow(true);

        if (hideControlsTimer) {
          clearTimeout(hideControlsTimer);
        }

        hideControlsTimer = window.setTimeout(() => {
          if (opt.checkHide ? opt.checkHide() : true) {
            onShow(false);
          }
        }, 1200);
      };

      // Инициализация таймера
      resetTimer();

      // 1️⃣ Скролл вверх
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

      // 2️⃣ Мышь у верхнего края (44px)
      const onMouseMove = (e: MouseEvent) => {
        const topZone = 44;
        const bottomZone = 48;

        if (
          e.clientY <= topZone ||
          e.clientY >= window.innerHeight - bottomZone
        ) {
          resetTimer();
        }
      };

      // 3️⃣ Любой клик
      const onClick = () => {
        resetTimer();
      };

      target.addEventListener('scroll', onScroll, { passive: true });
      target.addEventListener('mousemove', onMouseMove);
      target.addEventListener('click', onClick);

      // Очистка при размонтировании
      onCleanup(() => {
        target.removeEventListener('scroll', onScroll);
        target.removeEventListener('mousemove', onMouseMove);
        target.removeEventListener('click', onClick);
        if (hideControlsTimer) clearTimeout(hideControlsTimer);
      });
    }, 100);
  })
};