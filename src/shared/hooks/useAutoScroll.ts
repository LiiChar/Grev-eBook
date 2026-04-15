import { createSignal, onCleanup, onMount, createEffect } from 'solid-js';

export type UseAutoScrollProps = {
  speed?: number; // px per second
  autoscroll?: boolean;
  pauseOnHover?: boolean;
  onEndScroll?: () => void;
};

const defaultProps: UseAutoScrollProps &
	Required<Pick<UseAutoScrollProps, 'speed' | 'autoscroll' | 'pauseOnHover'>> =
	{
		speed: 60, // 60px в секунду
		autoscroll: false,
		pauseOnHover: false,
	};

export function useAutoScroll(
  target: string | HTMLElement,
  props: UseAutoScrollProps = {},
) {
  const opt = { ...defaultProps, ...props };

  const [scrolling, setScrolling] = createSignal(false);

  let element: HTMLElement | null = null;
  let rafId: number | null = null;
  let lastTime = 0;

  function resolveElement() {
    if (typeof target === 'string') {
      return document.querySelector<HTMLElement>(target);
    }
    return target;
  }

  let acc = 0; // аккумулятор дробных значений

  function loop(time: number) {
    if (!element) return;

    if (lastTime === 0) lastTime = time;

    const delta = (time - lastTime) / 1000;
    lastTime = time;

    acc += opt.speed * delta;

    const move = Math.floor(acc); // берём только целое
    acc -= move; // остаток сохраняем

    if (move > 0) {
      element.scrollTop += move;
    }

    if (element.scrollTop + element.clientHeight >= element.scrollHeight) {
      stopScroll();
      props.onEndScroll?.();
      return;
    }

    rafId = requestAnimationFrame(loop);
  }

  function startScroll() {
    if (!element || rafId) return;

    setScrolling(true);
    lastTime = 0;
    rafId = requestAnimationFrame(loop);
  }

  function stopScroll() {
    setScrolling(false);

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function handleMouseEnter() {
    if (opt.pauseOnHover) stopScroll();
  }

  function handleMouseLeave() {
    if (opt.pauseOnHover && opt.autoscroll) startScroll();
  }

  function handleUserScroll() {
    stopScroll();
  }

  onMount(() => {
    element = resolveElement();

    if (!element) return;

    element.addEventListener('wheel', handleUserScroll, { passive: true });
    element.addEventListener('touchstart', handleUserScroll, { passive: true });
    element.addEventListener('mousedown', handleUserScroll);

    if (opt.pauseOnHover) {
      element.addEventListener('mouseenter', handleMouseEnter);
      element.addEventListener('mouseleave', handleMouseLeave);
    }

    if (opt.autoscroll) {
      startScroll();
    }
  });

  onCleanup(() => {
    stopScroll();

    if (!element) return;

    element.removeEventListener('wheel', handleUserScroll);
    element.removeEventListener('touchstart', handleUserScroll);
    element.removeEventListener('mousedown', handleUserScroll);

    if (opt.pauseOnHover) {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
    }
  });

  createEffect(() => {
    if (opt.autoscroll) {
      startScroll();
    } else {
      stopScroll();
    }
  });

  return {
    scrolling,
    startScroll,
    stopScroll,
  };
}