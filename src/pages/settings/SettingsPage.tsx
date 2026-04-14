import { createSignal, For, Show, onMount, onCleanup } from 'solid-js';
import {
  settings,
  setTheme,
  setFontSize,
  setLineHeight,
  setColumnWidth,
  setAutoHide,
  setAnimations,
  setDistractionFree,
	setReaderMode,
} from '../../shared/stores/settingsStore';
import { GlassPanel } from '../../shared/ui/GlassPanel';
import { GlassButton } from '../../shared/ui/GlassButton';
import { Icon } from '../../shared/ui/Icon';
import { ThemeSelector } from '../../components/layout/ThemeSelector';
import { ToggleSwitch } from '../../shared/ui/ToggleSwitch';
import { Hotkey } from '../../shared/ui/Hotkey';

type SettingsSection = 'general' | 'reader' | 'ui' | 'hotkeys';

export function SettingsPage() {
  const [activeSection, setActiveSection] = createSignal<SettingsSection>('general');
  const [isDropdownOpen, setIsDropdownOpen] = createSignal(false);
  let dropdownRef: HTMLDivElement | undefined;

  const sections: { id: SettingsSection; label: string; icon: 'settings' | 'book' | 'adjustments' | 'listBullet' }[] = [
    { id: 'general', label: 'Общие', icon: 'settings' },
    { id: 'reader', label: 'Чтение', icon: 'book' },
    { id: 'ui', label: 'Интерфейс', icon: 'adjustments' },
    { id: 'hotkeys', label: 'Горячие клавиши', icon: 'listBullet' },
  ];

  const currentSection = () => sections.find(s => s.id === activeSection())!;

  // Закрытие меню при клике вне его
  const handleClickOutside = (e: MouseEvent) => {
    if (dropdownRef && !dropdownRef.contains(e.target as Node)) {
      setIsDropdownOpen(false);
    }
  };

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
  });

  onCleanup(() => {
    document.removeEventListener('click', handleClickOutside);
  });

  return (
		<div class='h-full flex flex-col overflow-hidden'>
			{/* Header с выпадающим меню */}
			<header class='shrink-0 border-b border-[var(--border)] p-4'>
				<div class='max-w-3xl mx-auto'>
					<h1 class='flex items-center gap-2 '>
						<Icon name='settings' size={20} class='sm:hidden' />
						<span class='hidden sm:inline'>Настройки</span>
					</h1>
				</div>
			</header>

			{/* Content */}
			<main class='flex-1 overflow-y-auto p-4 md:p-6'>
				<div class='relative mb-4' ref={dropdownRef}>
					<button
						onClick={e => {
							e.stopPropagation();
							setIsDropdownOpen(!isDropdownOpen());
						}}
						class='w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors border border-[var(--border)] text-left'
					>
						<div class='flex items-center gap-3'>
							<Icon name={currentSection().icon} size={18} />
							<span class='text-sm font-medium'>{currentSection().label}</span>
						</div>
						<Icon
							name='chevronDown'
							size={16}
							class={`transition-transform ${isDropdownOpen() ? 'rotate-180' : ''}`}
						/>
					</button>

					<Show when={isDropdownOpen()}>
						<div class='absolute top-full left-0 right-0 mt-1 bg-[var(--surface)] border border-[var(--border)] backdrop-blur-lg rounded-lg shadow-lg z-50 overflow-hidden'>
							<For each={sections}>
								{section => (
									<button
										onClick={() => {
											setActiveSection(section.id);
											setIsDropdownOpen(false);
										}}
										class={`
                        w-full flex items-center gap-3 px-4 py-2.5 text-sm
                        transition-colors text-left
                        ${
													activeSection() === section.id
														? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
														: 'hover:bg-[var(--surface-hover)]'
												}
                      `}
									>
										<Icon name={section.icon} size={18} />
										{section.label}
									</button>
								)}
							</For>
						</div>
					</Show>
				</div>
				<div class='max-w-3xl mx-auto space-y-6'>
					{/* General */}
					<Show when={activeSection() === 'general'}>
						<SettingsGroup title='Общие настройки'>
							{/* Theme */}
							<SettingRow
								label='Тема оформления'
								description='Выберите цветовую схему приложения'
							>
								<ThemeSelector
									onChange={theme => setTheme(theme)}
									value={settings.general.theme}
								/>
							</SettingRow>
						</SettingsGroup>
					</Show>

					{/* Reader */}
					<Show when={activeSection() === 'reader'}>
						<SettingsGroup title='Настройки чтения'>
							{/* Reader mode */}
							<SettingRow
								label='Режим чтения'
								description='Выберите режим отображения'
							>
								<div class='flex items-center gap-1 p-0.5 rounded-lg w-full bg-[var(--surface-hover)]'>
									<button
										onClick={() => setReaderMode('scroll')}
										class={`px-3 py-1.5 w-full text-xs rounded-md transition-colors ${
											settings.reader.mode === 'scroll'
												? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
												: 'hover:bg-[var(--surface-active)]'
										}`}
									>
										Свиток
									</button>
									<button
										onClick={() => setReaderMode('chapters')}
										class={`px-3 py-1.5 w-full text-xs rounded-md transition-colors ${
											settings.reader.mode === 'chapters'
												? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
												: 'hover:bg-[var(--surface-active)]'
										}`}
									>
										Главы
									</button>
								</div>
							</SettingRow>

							{/* Font size */}
							<SettingRow
								label='Размер шрифта'
								description={`${settings.reader.font_size}px`}
							>
								<div class='flex items-center gap-3 w-full sm:w-auto'>
									<GlassButton
										size='icon'
										variant='ghost'
										onClick={() => setFontSize(settings.reader.font_size - 1)}
									>
										<Icon name='minus' size={16} />
									</GlassButton>
									<input
										type='range'
										min='12'
										max='32'
										value={settings.reader.font_size}
										onInput={e => setFontSize(parseInt(e.currentTarget.value))}
										class='flex-1 sm:w-28'
									/>
									<GlassButton
										size='icon'
										variant='ghost'
										onClick={() => setFontSize(settings.reader.font_size + 1)}
									>
										<Icon name='plus' size={16} />
									</GlassButton>
								</div>
							</SettingRow>

							{/* Line height */}
							<SettingRow
								label='Межстрочный интервал'
								description={settings.reader.line_height.toFixed(1)}
							>
								<div class='flex items-center gap-3 w-full sm:w-auto'>
									<GlassButton
										size='icon'
										variant='ghost'
										onClick={() =>
											setLineHeight(settings.reader.line_height - 0.1)
										}
									>
										<Icon name='minus' size={16} />
									</GlassButton>
									<input
										type='range'
										min='1.2'
										max='2.5'
										step='0.1'
										value={settings.reader.line_height}
										onInput={e =>
											setLineHeight(parseFloat(e.currentTarget.value))
										}
										class='flex-1 sm:w-28'
									/>
									<GlassButton
										size='icon'
										variant='ghost'
										onClick={() =>
											setLineHeight(settings.reader.line_height + 0.1)
										}
									>
										<Icon name='plus' size={16} />
									</GlassButton>
								</div>
							</SettingRow>

							{/* Column width */}
							<SettingRow
								label='Ширина колонки'
								description={`${settings.reader.column_width}px`}
							>
								<div class='flex items-center gap-3 w-full sm:w-auto'>
									<GlassButton
										size='icon'
										variant='ghost'
										onClick={() =>
											setColumnWidth(settings.reader.column_width - 40)
										}
									>
										<Icon name='minus' size={16} />
									</GlassButton>
									<input
										type='range'
										min='400'
										max='1200'
										step='40'
										value={settings.reader.column_width}
										onInput={e =>
											setColumnWidth(parseInt(e.currentTarget.value))
										}
										class='flex-1 sm:w-28'
									/>
									<GlassButton
										size='icon'
										variant='ghost'
										onClick={() =>
											setColumnWidth(settings.reader.column_width + 40)
										}
									>
										<Icon name='plus' size={16} />
									</GlassButton>
								</div>
							</SettingRow>
						</SettingsGroup>
					</Show>

					{/* UI */}
					<Show when={activeSection() === 'ui'}>
						<SettingsGroup title='Настройки интерфейса'>
							<SettingRow
								label='Автоскрытие панелей'
								description='Скрывать панели управления при чтении'
							>
								<ToggleSwitch
									checked={settings.ui.auto_hide}
									onChange={setAutoHide}
								/>
							</SettingRow>

							<SettingRow
								label='Анимации'
								description='Плавные переходы и анимации'
							>
								<ToggleSwitch
									checked={settings.ui.animations}
									onChange={setAnimations}
								/>
							</SettingRow>

							<SettingRow
								label='Режим без отвлечений'
								description='Минимальный интерфейс при чтении'
							>
								<ToggleSwitch
									checked={settings.ui.distraction_free}
									onChange={setDistractionFree}
								/>
							</SettingRow>
						</SettingsGroup>
					</Show>

					{/* Hotkeys */}
					<Show when={activeSection() === 'hotkeys'}>
						<SettingsGroup title='Горячие клавиши'>
							<div class='p-4 space-y-3'>
								<Hotkey
									label='Следующая страница'
									keys={['→', 'Space', 'PgDn']}
								/>
								<Hotkey label='Предыдущая страница' keys={['←', 'PgUp']} />
								<Hotkey label='Оглавление' keys={['T']} />
								<Hotkey label='Добавить закладку' keys={['B']} />
								<Hotkey label='Полный экран' keys={['F']} />
								<Hotkey label='Выход' keys={['Esc']} />
							</div>
						</SettingsGroup>
					</Show>
				</div>
			</main>
		</div>
	);
}


export function ReaderSettings ({variant = 'default'}: {variant?: 'default' | 'minimal'}) {
	console.log(settings.reader.mode);
	return (
		<SettingsGroup variant={variant} title='Настройки чтения'>
			<SettingRow variant='default' label='Режим чтения'>
				<div class='flex items-center gap-1 p-0.5 rounded-lg w-full bg-[var(--surface-hover)]'>
					<button
						onClick={() => setReaderMode('scroll')}
						class={`px-3 py-1 w-full text-xs rounded-md transition-colors ${
							settings.reader.mode === 'scroll'
								? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
								: 'hover:bg-[var(--surface-active)]'
						}`}
					>
						Свиток
					</button>
					<button
						onClick={() => setReaderMode('chapters')}
						class={`px-3 py-1 w-full text-xs rounded-md transition-colors ${
							settings.reader.mode === 'chapters'
								? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
								: 'hover:bg-[var(--surface-active)]'
						}`}
					>
						Главы
					</button>
				</div>
			</SettingRow>
			{/* Font size */}
			<SettingRow
				variant={variant}
				label='Размер шрифта'
				description={`${settings.reader.font_size}px`}
			>
				<div class='flex items-center gap-3'>
					<GlassButton
						size='icon'
						variant='ghost'
						onClick={() => setFontSize(settings.reader.font_size - 1)}
					>
						<Icon name='minus' size={16} />
					</GlassButton>
					<input
						type='range'
						min='12'
						max='32'
						value={settings.reader.font_size}
						onInput={e => setFontSize(parseInt(e.currentTarget.value))}
						class='w-full'
					/>
					<GlassButton
						size='icon'
						variant='ghost'
						onClick={() => setFontSize(settings.reader.font_size + 1)}
					>
						<Icon name='plus' size={16} />
					</GlassButton>
				</div>
			</SettingRow>

			{/* Line height */}
			<SettingRow
				variant={variant}
				label='Межстрочный интервал'
				description={settings.reader.line_height.toFixed(1)}
			>
				<div class='flex items-center gap-3'>
					<GlassButton
						size='icon'
						variant='ghost'
						onClick={() => setLineHeight(settings.reader.line_height - 0.1)}
					>
						<Icon name='minus' size={16} />
					</GlassButton>
					<input
						type='range'
						min='1.2'
						max='2.5'
						step='0.1'
						value={settings.reader.line_height}
						onInput={e => setLineHeight(parseFloat(e.currentTarget.value))}
						class='w-full'
					/>
					<GlassButton
						size='icon'
						variant='ghost'
						onClick={() => setLineHeight(settings.reader.line_height + 0.1)}
					>
						<Icon name='plus' size={16} />
					</GlassButton>
				</div>
			</SettingRow>

			{/* Column width */}
			<SettingRow
				variant={variant}
				label='Ширина колонки'
				description={`${settings.reader.column_width}px`}
			>
				<div class='flex items-center gap-3'>
					<GlassButton
						size='icon'
						variant='ghost'
						onClick={() => setColumnWidth(settings.reader.column_width - 40)}
					>
						<Icon name='minus' size={16} />
					</GlassButton>
					<input
						type='range'
						min='400'
						max='1200'
						step='40'
						value={settings.reader.column_width}
						onInput={e => setColumnWidth(parseInt(e.currentTarget.value))}
						class='w-full'
					/>
					<GlassButton
						size='icon'
						variant='ghost'
						onClick={() => setColumnWidth(settings.reader.column_width + 40)}
					>
						<Icon name='plus' size={16} />
					</GlassButton>
				</div>
			</SettingRow>
		</SettingsGroup>
	);
}

// Helper components
function SettingsGroup(props: { title: string; children: any, variant?: 'default' | 'minimal' }) {
  return (
		<div class='animate-fade-in'>
			{props.variant == 'default' && (
				<h2 class='text-base font-semibold mb-3'>{props.title}</h2>
			)}
			<GlassPanel
				class={
					props.variant == 'minimal'
						? 'border-0!'
						: 'divide-y divide-(--border)'
				}
				padding='none'
				rounded='lg'
			>
				{props.children}
			</GlassPanel>
		</div>
	);
}

function SettingRow(props: {
	label: string;
	description?: string;
	children: any;
	variant?: 'default' | 'minimal';
}) {
	return (
		<div
			class={
				props.variant == 'minimal'
					? 'flex items-center justify-between gap-0 py-2 px-2 flex-wrap'
					: 'flex items-center justify-between gap-4 px-4 py-3 flex-wrap'
			}
		>
			<div class='flex-1 relative z-1 flex-col '>
				<p class='font-medium text-sm'>{props.label}</p>
				<Show when={props.description}>
					<p class='text-xs text-[var(--foreground-muted)] mt-0.5'>
						{props.description}
					</p>
				</Show>
			</div>
			{props.children}
		</div>
	);
}



