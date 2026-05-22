export function scrollToTop(root: HTMLElement | string, behavior: ScrollBehavior = 'smooth') {
	typeof root === 'string'
		? document.querySelector(root)?.scrollTo({ top: 0, behavior })
		: root?.scrollTo({ top: 0, behavior });
}
