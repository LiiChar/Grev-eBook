import { useLocation, useNavigate } from "@solidjs/router";
import { createSignal, Show } from "solid-js";
import { Icon, IconName } from "../../shared/ui/Icon";
import { getCurrentWindow } from "@tauri-apps/api/window";
import Button from "@/shared/ui/Button";


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

const logo = './src/assets/icon/icon.png';

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
            h-full flex-col border-border/40 border-r-1 border-t-0 border-b-0
            transition-all duration-300 ease-out shrink-0
            ${sidebarCollapsed() ? 'w-16' : 'w-38'}
          `}
				>
					{/* Logo */}
					<div class=' h-14 flex items-center  justify-between px-4 border-b border-border relative'>
						<Show when={!sidebarCollapsed()}>
							<span class='font-semibold text-lg tracking-tight'>
								<img src={logo} alt='logo' class='w-7 h-7' />
							</span>
							<Button
								onClick={() => appWindow.close()}
								variant='ghost'
								class='aspect-square max-h-8 h-8 w-8 rounded-full -mr-1 group'
							>
								<Icon name='x' size={18} class='group-hover:text-destructive' />
							</Button>
						</Show>
						<Show when={sidebarCollapsed()}>
							<div class='relative group'>
								<img src={logo} alt='logo' class=' max-w-8 w-full h-fulf' />
								<Button
									color='error'
									class=' transition-opacity opacity-0 group-hover:opacity-100 absolute top-0 left-0 h-full w-full p-4 cursor-pointer rounded-full scale-125'
								>
									<Icon onClick={() => appWindow.close()} name='x' size={18} />
								</Button>
							</div>
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
																				? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
																				: 'hover:bg-secondary/60 text-foreground'
																		}

									${sidebarCollapsed() ? 'aspect-square justify-center h-[40px] rounded-full!' : 'px-3 py-2.5'}
                `}
							>
								<Icon
									class={`text-foreground ${
										isActive(item.path) ? 'text-primary-foreground' : ''
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
					<div class='p-2 border-t border-border'>
						<button
							onClick={() => setSidebarCollapsed(!sidebarCollapsed())}
							class='w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                     hover:bg-secondary-hover/60 text-muted-foreground
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