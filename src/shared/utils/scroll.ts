export function scrollToTop(root: HTMLElement | string) {
	typeof root === 'string'
		? document.querySelector(root)?.scrollTo({ top: 0, behavior: 'smooth' })
		: root?.scrollTo({ top: 0, behavior: 'smooth' });
}
