import { createSignal, For, Show } from 'solid-js';
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
import type { Theme } from '../../shared/api/settings';
import { ThemeSelector } from '../../components/layout/ThemeSelector';
import { ToggleSwitch } from '../../shared/ui/ToggleSwitch';
import { Hotkey } from '../../shared/ui/Hotkey';

type SettingsSection = 'general' | 'reader' | 'ui' | 'hotkeys';

export function SettingsPage() {
  const [activeSection, setActiveSection] = createSignal<SettingsSection>('general');

  const sections: { id: SettingsSection; label: string; icon: 'settings' | 'book' | 'adjustments' | 'listBullet' }[] = [
    { id: 'general', label: 'Общие', icon: 'settings' },
    { id: 'reader', label: 'Чтение', icon: 'book' },
    { id: 'ui', label: 'Интерфейс', icon: 'adjustments' },
    { id: 'hotkeys', label: 'Горячие клавиши', icon: 'listBullet' },
  ];

  return (
		<div class='h-full flex overflow-hidden'>
			{/* Sidebar */}
			<nav class='w-52 shrink-0 border-r border-[var(--border)] p-3 space-y-1'>
				<h1 class='text-lg font-semibold mb-4 px-3'>Настройки</h1>
				<For each={sections}>
					{section => (
						<button
							onClick={() => setActiveSection(section.id)}
							class={`
                w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm
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
			</nav>

			{/* Content */}
			<main class='flex-1 overflow-y-auto p-6 '>
				<div class='max-w-2xl'>
					{/* General */}
					<Show when={activeSection() === 'general'}>
						<SettingsGroup title='Общие настройки'>
							{/* Theme */}
							<SettingRow
								label='Тема оформления'
								description='Выберите цветовую схему приложения'
							>
								<ThemeSelector onChange={(theme) => setTheme(theme)} value={settings.general.theme} />
							</SettingRow>
						</SettingsGroup>
					</Show>

					{/* Reader */}
					<Show when={activeSection() === 'reader'}>
						<SettingsGroup title='Настройки чтения'>
							{/* Font size */}
							<SettingRow
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
										class='w-28'
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
								<div class='flex items-center gap-3'>
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
										class='w-28'
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
								<div class='flex items-center gap-3'>
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
										class='w-28'
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
								description='Минимальный интерфейс'

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



