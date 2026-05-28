import { Accessor, JSX, Show } from "solid-js";
import { GlassButton } from "../../shared/ui/GlassButton";
import { Icon } from "../../shared/ui/Icon";
import { ThemeSelector } from "../layout/ThemeSelector";
import { ReaderSettings } from "../../pages/settings/SettingsPage";
import { setTheme, settings } from "../../shared/stores/settingsStore";
import { useClickOutside } from "../../shared/hooks/useClickOutside";

type SettingSidebarProps = {
	show: Accessor<boolean>;
	setShow: (value: boolean) => void;
} & JSX.HTMLAttributes<HTMLElement>;

export const SettingSidebar = ({class: className, show, setShow, ...attr}: SettingSidebarProps) => {
		const ref = useClickOutside(() => setShow(false));
	return (
		<Show when={show()}>
			<aside
				ref={ref}
				{...attr}
				class={
					'absolute right-3.5 rounded-lg top-13 backdrop-blur-lg bg-background/40 bottom-2 w-64 z-20  border-l border-border animate-slide-in-right ' +
					className
				}
			>
				<div class='h-full flex flex-col'>
					<div class='p-3 border-b border-border flex items-center justify-between'>
						<h2 class='font-semibold text-sm'>Настройки</h2>
						<GlassButton size='icon' variant='ghost' onClick={() => setShow(false)}>
							<Icon name='x' size={16} />
						</GlassButton>
					</div>
					<div class='flex-1 overflow-y-auto p-4 space-y-4'>
						{/* Theme */}
						<div>
							<label class='text-xs font-medium mb-2 block text-muted-foreground'>
								Тема
							</label>
							<ThemeSelector
								onChange={theme => setTheme(theme)}
								value={settings.general.theme}
							/>
						</div>

						<ReaderSettings variant='minimal' />
					</div>
				</div>
			</aside>
		</Show>
	);
}