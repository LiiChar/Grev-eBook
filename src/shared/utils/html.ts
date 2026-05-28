import * as htmlToImage from 'html-to-image';
import { wait } from './promise';

export const stripHtml = (html: string) =>
	html
		.replace(/<[^>]+>/g, '')
		.replace(/\s+/g, ' ')
		.trim();

async function waitForImages(root: HTMLElement) {
	const images = Array.from(root.querySelectorAll('img'));

	await Promise.all(
		images.map(img => {
			if (img.complete) return Promise.resolve();

			return new Promise(resolve => {
				img.onload = resolve;
				img.onerror = resolve;
			});
		}),
	);
}

export async function htmlStringToBase64(html: string) {
	const container = document.createElement('div');

	container.style.position = 'fixed';
	container.style.left = '-99999px';
	container.style.top = '0';

	// размеры будущей обложки
	container.style.width = '1600px';
	container.style.height = '2400px';

	container.innerHTML = html;

	document.body.appendChild(container);

	try {
		await waitForAssets(container);

		const base64 = await htmlToImage.toPng(container, {
			width: 1600,
			height: 2400,
			pixelRatio: 2,
			cacheBust: true,
			backgroundColor: '#ffffff',
		});

		return base64;
	} finally {
		container.remove();
	}
}

async function waitForAssets(node: Element) {
	// шрифты
	if (document.fonts) {
		await document.fonts.ready;
	}

	// изображения
	const images = [...node.querySelectorAll('img')];

	await Promise.all(
		images.map(img => {
			if (img.complete) return Promise.resolve();

			return new Promise(resolve => {
				img.onload = resolve;
				img.onerror = resolve;
			});
		}),
	);

	// даём браузеру дорисовать layout
	await new Promise(r => requestAnimationFrame(r));
}