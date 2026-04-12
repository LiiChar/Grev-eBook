import { useLocation, useNavigate } from "@solidjs/router";
import { Icon, IconName } from "../../shared/ui/Icon";
import { Tooltip } from "@/shared/ui/Tooltip";

type NavItem = {
	path: string;
	icon: IconName;
	label: string;
};

const navItems: NavItem[] = [
	{ path: '/', icon: 'home', label: 'Библиотека' },
	{ path: '/bookmarks', icon: 'bookmark', label: 'Закладки' },
	{ path: '/settings', icon: 'settings', label: 'Настройки' },
];

export const MobileNav = () => {
	const location = useLocation();
	const navigate = useNavigate();

	const isActive = (path: string) => {
		if (path === '/') return location.pathname === '/';
		return location.pathname.startsWith(path);
	};

	const isReaderPage = () => location.pathname.includes('/read');

	if (isReaderPage()) return null;

	return (
		<nav
			class='
				fixed bottom-1 left-0 right-0 z-50
				flex items-center justify-center
				min-[500px]:hidden
			'
		>
			<div class='flex items-center rounded-full justify-center backdrop-blur-xl border-t border-(--border) bg-(--background)/20 px-2 pt-1 pb-2 safe-area-inset-bottom'>
				{navItems.map(item => (
					<Tooltip text={item.label}>
						<button
							onClick={() => navigate(item.path)}
							class={`
							flex flex-col items-center justify-center gap-0.5
							min-w-12 px-3 py-1.5
							rounded-xl
							transition-all duration-150
							${
								isActive(item.path)
									? 'text-(--primary)'
									: 'text-(--foreground-muted) hover:text-(--foreground)'
							}
						`}
						>
							<Icon
								name={item.icon}
								size={24}
								class={`transition-colors ${
									isActive(item.path) ? 'stroke-(--primary)' : ''
								}`}
							/>
						</button>
					</Tooltip>
				))}
			</div>
		</nav>
	);
};
