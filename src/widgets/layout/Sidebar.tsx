import { useLocation, useNavigate } from "@solidjs/router";
import { createSignal, Show } from "solid-js";
import { Icon, IconName } from "../../shared/ui/Icon";
import { getCurrentWindow } from "@tauri-apps/api/window";


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

const appWindow = getCurrentWindow();

export const Sidebar = () => {
   const location = useLocation();
		const navigate = useNavigate();
		const [sidebarCollapsed, setSidebarCollapsed] = createSignal(false);


		const isActive = (path: string) => {
			if (path === '/') return location.pathname === '/';
			return location.pathname.startsWith(path);
		};

		const isReaderPage = () => location.pathname.includes('/read');

  return (
		<Show when={!isReaderPage()}>
			<aside
				class={`
            hidden min-[500px]:flex
            h-full flex-col border-(--border)/40 border-r-1 border-t-0 border-b-0
            transition-all duration-300 ease-out shrink-0
            ${sidebarCollapsed() ? 'w-16' : 'w-38'}
          `}
			>
				{/* Logo */}
				<div class='group h-14 flex items-center  justify-between px-4 border-b border-(--border) relative'>
					<Show when={!sidebarCollapsed()}>
						<span class='font-semibold text-lg tracking-tight'>Grev</span>
						<Icon
							onClick={() => appWindow.close()}
							name='x'
							size={18}
							class='hover:stroke-red-600! transition-opacity cursor-pointer'
						/>
					</Show>
					<Show when={sidebarCollapsed()}>
						<Icon
							class='group-hover:opacity-0 transition-opacity'
							name='book'
							size={24}
						/>
						<Icon
							onClick={() => appWindow.close()}
							name='x'
							size={18}
							class='hover:stroke-red-600! transition-opacity opacity-0 group-hover:opacity-100 absolute top-0 left-0 h-full w-full p-4 cursor-pointer'
						/>
					</Show>
				</div>

				{/* Navigation */}
				<nav class='flex-1 p-2 space-y-1'>
					{navItems.map(item => (
						<button
							onClick={() => navigate(item.path)}
							class={`
                  w-full flex items-center gap-3  rounded-lg
                  transition-all duration-150 text-left
                  ${
										isActive(item.path)
											? 'bg-(--primary) text-(--primary-foreground) shadow-lg shadow-(--primary)/20'
											: 'hover:bg-(--surface-hover) text-(--foreground)'
									}

									${sidebarCollapsed() ? 'aspect-square justify-center h-[40px] rounded-full!' : 'px-3 py-2.5'}
                `}
						>
							<Icon
								class={`text-(--foreground) ${
									isActive(item.path) ? 'text-(--primary-foreground)' : ''
								}`}
								name={item.icon}
								size={20}
							/>
							<Show when={!sidebarCollapsed()}>
								<span class='text-sm font-medium'>{item.label}</span>
							</Show>
						</button>
					))}
				</nav>

				{/* Collapse toggle */}
				<div class='p-2 border-t border-[var(--border)]'>
					<button
						onClick={() => setSidebarCollapsed(!sidebarCollapsed())}
						class='w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                     hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)]
                     transition-colors'
					>
						{sidebarCollapsed() ? (
							<Icon name={'chevronRight'} size={18} />
						) : (
							<Icon name={'chevronLeft'} size={18} />
						)}
					</button>
				</div>
			</aside>
		</Show>
	);
}