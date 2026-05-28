import { join } from '@tauri-apps/api/path';
import { readDir } from '@tauri-apps/plugin-fs';

export const getOS = () => {
	const userAgent = window.navigator.userAgent;
	if (userAgent.includes('Win')) {
		return 'Windows';
	} else if (userAgent.includes('Linux')) {
		return 'Linux';
	} else if (userAgent.includes('Mac')) {
		return 'macOS';
	} else {
		return 'Unknown';
	}
};

export const getSep = () => {
	const os = getOS();
	if (os === 'Windows') {
		return '\\';
	}
	return '/';
};

export const readFolder = async (
	path: string,
	rec: boolean = false,
): Promise<string[]> => {
	const entries = await readDir(path);
	const fileList: string[] = [];
	for (const entry of entries) {
		const fullPath = await join(path, entry.name);
		if (entry.name.startsWith('.')) {
			continue;
		}
		if (entry.isDirectory && rec) {
			const subDirFiles = await readFolder(fullPath);
			fileList.push(...subDirFiles);
		} else {
			fileList.push(fullPath);
		}
	}
	return fileList;
};

export const getFolerPath = (path: string) =>
	path.split(getSep()).slice(0, -1).join(getSep()) + getSep();

export const getFileName = (path: string) =>
	path.split(getSep()).pop()?.split('.')[0]!;

export function escapeFileName(title: string, maxLength = 100) {
	const map = {
		'<': '_lt_',
		'>': '_gt_',
		':': '_colon_',
		'"': '_quote_',
		'/': '_slash_',
		'\\': '_backslash_',
		'|': '_pipe_',
		'?': '_question_',
		'*': '_star_',
	};

	// заменяем все недопустимые символы на "читаемые" экранированные варианты
	let escaped = title.replace(
		/[<>:"/\\|?*]/g,
		c => map[c as keyof typeof map] || '_',
	);

	// убираем невидимые символы (например, управляющие ASCII)
	escaped = escaped.replace(/[\x00-\x1F]/g, '');

	// нормализуем пробелы
	escaped = escaped.replace(/\s+/g, ' ').trim();

	// ограничиваем длину
	if (escaped.length > maxLength) {
		escaped = escaped.slice(0, maxLength);
	}

	return escaped || 'untitled';
}
