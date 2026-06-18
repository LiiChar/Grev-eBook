import { JSX, onCleanup, onMount } from 'solid-js';
import { loadSettings } from '../../shared/stores/settingsStore';
import { Toaster } from '../../shared/ui/Toaster';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { useNavigate } from '@solidjs/router';
export function AppLayout(props: { children?: JSX.Element }) {

	const navigate = useNavigate();
	  function handleKeyDown(e: KeyboardEvent) {


    switch (e.code) {
      case 'KeyM':
        e.preventDefault();
				navigate("/")
        break;
    }
  }

  onMount(async () => {
    await loadSettings();

				document.addEventListener('keydown', handleKeyDown);
		
				onCleanup(() => {
					document.removeEventListener('keydown', handleKeyDown);
				});
  });

  return (
		<div class='flex h-full w-full overflow-hidden bg-background'>
			<Sidebar />

			<main class='flex-1 h-full overflow-hidden flex flex-col md:pb-0 '>
				{props.children}
			</main>

			<MobileNav />
			<Toaster />
		</div>
	);
}

