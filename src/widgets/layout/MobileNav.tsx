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
				bottom-navbar
				fixed bottom-2 left-0 right-0 z-50
				flex items-center justify-center
				min-[500px]:hidden
			'
		>
			<div class='flex items-center rounded-full justify-center backdrop-blur-xl border-t border-border p-1 bg-background/40 safe-area-inset-bottom'>
				{navItems.map(item => (
					<Tooltip text={item.label}>
						<button
							onClick={() => navigate(item.path)}
							class={`
							flex flex-col items-center justify-center gap-0.5 aspect-square rounded-full
							min-w-12 p-4
							transition-all duration-150
							hover:bg-primary/10
							${
								isActive(item.path)
									? 'text-primary'
									: 'text-muted-foreground hover:text-foreground'
							}
						`}
						>
							<Icon
								name={item.icon}
								size={24}
								class={`transition-colors ${
									isActive(item.path) ? 'stroke-primary' : ''
								}`}
							/>
						</button>
					</Tooltip>
				))}
			</div>
		</nav>
	);
};
