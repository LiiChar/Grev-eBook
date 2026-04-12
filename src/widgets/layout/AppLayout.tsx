import { JSX, onMount } from 'solid-js';
import { loadSettings } from '../../shared/stores/settingsStore';
import { Toaster } from '../../shared/ui/Toaster';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { clearStore } from '@/shared/api/book';

export function AppLayout(props: { children?: JSX.Element }) {

  onMount(async () => {
		await clearStore();
    await loadSettings();
  });

  return (
		<div class='flex h-full w-full overflow-hidden bg-(--background)'>
			<Sidebar/>

			<main class='flex-1 h-full overflow-hidden flex flex-col md:pb-0 '>
				{props.children}
			</main>

			<MobileNav />
			<Toaster />
		</div>
	);
}

