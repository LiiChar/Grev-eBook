import { createMemo, JSX } from 'solid-js';
import { useLocation, useNavigate } from '@solidjs/router';

type BreadcrumbItem = {
	label: string;
	path: string;
	isCurrent: boolean;
};

export const Breadcrumb = ({class: className}: JSX.HTMLAttributes<HTMLDivElement>) => {
	const location = useLocation();
	const navigate = useNavigate();

	const items = createMemo<BreadcrumbItem[]>(() => {
		const pathnames = location.pathname.split('/').filter(x => x); // удаляем пустые сегменты

		const crumbs: BreadcrumbItem[] = [];

		// Добавляем корень
		crumbs.push({
			label: 'Библиотека',
			path: '/',
			isCurrent: pathnames.length === 0,
		});

		let currentPath = '';
		for (let i = 0; i < pathnames.length; i++) {
			const segment = pathnames[i];
			currentPath += `/${segment}`;

			let label = segment;

			// Маппинг маршрутов на понятные названия
			if (i === 0) {
				// Первый сегмент — ID книги
				label = 'Книга';
			} else if (segment === 'read') {
				label = 'Чтение';
			}

			crumbs.push({
				label,
				path: currentPath,
				isCurrent: i === pathnames.length - 1,
			});
		}

		return crumbs;
	});

	// Не показываем, если только один элемент (корень)
	if (items().length <= 1) return null;

	return (
		<nav class={'text-xs breadcrumbs ' + (className ?? '')}>
			<ul class='overflow-hidden'>
				{items().map(item => (
					<li>
						{item.isCurrent ? (
							<span>{item.label}</span>
						) : (
							<button
								type='button'
								class='hover:underline cursor-pointer inline-flex gap-2 items-center'
								onClick={() => navigate(item.path)}
							>
								{item.label}
							</button>
						)}
					</li>
				))}
			</ul>
		</nav>
	);
};
