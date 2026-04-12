import { JSX, splitProps } from 'solid-js';

export type IconName = keyof typeof icons;

type IconProps = {
	name: IconName;
	size?: number;
	class?: string;
} & JSX.SvgSVGAttributes<SVGSVGElement>;

const icons = {
	// Navigation
	home: () => (
		<path
			stroke-linecap='round'
			stroke-linejoin='round'
			d='m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25'
		/>
	),
	book: () => (
		<path
			stroke-linecap='round'
			stroke-linejoin='round'
			d='M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25'
		/>
	),
	bookOpen: () => (
		<path
			stroke-linecap='round'
			stroke-linejoin='round'
			d='M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25'
		/>
	),
	bookmark: () => (
		<path
			stroke-linecap='round'
			stroke-linejoin='round'
			d='M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z'
		/>
	),
	bookmarkSolid: () => (
		<path
			fill-rule='evenodd'
			d='M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z'
			clip-rule='evenodd'
		/>
	),
	editNote: () => (
		<path
			stroke-linecap='round'
			stroke-linejoin='round'
			d='M8.25 3.75h7.5L20.25 8.25v6.75
       M15.75 3.75V8.25h4.5
       M9.75 11.25h6
       M12 19.5l4.5-4.5 2.25 2.25L14.25 21H12v-1.5Z
       M16.5 15l1.5-1.5a1.06 1.06 0 0 1 1.5 0l.75.75a1.06 1.06 0 0 1 0 1.5L18.75 17.25'
		/>
	),
	removeNote: () => (
		<path
			stroke-linecap='round'
			stroke-linejoin='round'
			d='M8.25 3.75h7.5L20.25 8.25v9A2.25 2.25 0 0 1 18 19.5H8.25A2.25 2.25 0 0 1 6 17.25V6A2.25 2.25 0 0 1 8.25 3.75Z
       M15.75 3.75V8.25h4.5
       M10.5 12.75l3 3
       M13.5 12.75l-3 3'
		/>
	),
	note: () => (
		<path
			stroke-linecap='round'
			stroke-linejoin='round'
			d='M8.25 3.75h7.5L20.25 8.25v9A2.25 2.25 0 0 1 18 19.5H8.25A2.25 2.25 0 0 1 6 17.25V6A2.25 2.25 0 0 1 8.25 3.75Z
       M15.75 3.75V8.25h4.5
       M9.75 11.25h6
       M9.75 14.25h6'
		/>
	),
	// UI
	settings: () => (
		<path
			stroke-linecap='round'
			stroke-linejoin='round'
			d='M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z'
		/>
	),
	menu: () => (
		<path
			stroke-linecap='round'
			stroke-linejoin='round'
			d='M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5'
		/>
	),
	x: () => (
		<path
			stroke-linecap='round'
			stroke-linejoin='round'
			d='M6 18 18 6M6 6l12 12'
		/>
	),
	chevronLeft: () => (
		<path
			stroke-linecap='round'
			stroke-linejoin='round'
			d='M15.75 19.5 8.25 12l7.5-7.5'
		/>
	),
	chevronRight: () => (
		<path
			stroke-linecap='round'
			stroke-linejoin='round'
			d='m8.25 4.5 7.5 7.5-7.5 7.5'
		/>
	),
	chevronDown: () => (
		<path
			stroke-linecap='round'
			stroke-linejoin='round'
			d='m19.5 8.25-7.5 7.5-7.5-7.5'
		/>
	),
	chevronUp: () => (
		<path
			stroke-linecap='round'
			stroke-linejoin='round'
			d='m4.5 15.75 7.5-7.5 7.5 7.5'
		/>
	),
	plus: () => (
		<path
			stroke-linecap='round'
			stroke-linejoin='round'
			d='M12 4.5v15m7.5-7.5h-15'
		/>
	),
	minus: () => (
		<path stroke-linecap='round' stroke-linejoin='round' d='M5 12h14' />
	),
	// Actions
	search: () => (
		<path
			stroke-linecap='round'
			stroke-linejoin='round'
			d='m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z'
		/>
	),
	edit: () => (
		<path
			stroke-linecap='round'
			stroke-linejoin='round'
			d='m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10'
		/>
	),
	trash: () => (
		<path
			stroke-linecap='round'
			stroke-linejoin='round'
			d='m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0'
		/>
	),
	folder: () => (
		<path
			stroke-linecap='round'
			stroke-linejoin='round'
			d='M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z'
		/>
	),
	// Reader
	sun: () => (
		<path
			stroke-linecap='round'
			stroke-linejoin='round'
			d='M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z'
		/>
	),
	moon: () => (
		<path
			stroke-linecap='round'
			stroke-linejoin='round'
			d='M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z'
		/>
	),
	documentText: () => (
		<path
			stroke-linecap='round'
			stroke-linejoin='round'
			d='M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z'
		/>
	),
	listBullet: () => (
		<path
			stroke-linecap='round'
			stroke-linejoin='round'
			d='M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z'
		/>
	),
	arrowsExpand: () => (
		<path
			stroke-linecap='round'
			stroke-linejoin='round'
			d='M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15'
		/>
	),
	arrowsCollapse: () => (
		<path
			stroke-linecap='round'
			stroke-linejoin='round'
			d='M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25'
		/>
	),
	bars3: () => (
		<path
			stroke-linecap='round'
			stroke-linejoin='round'
			d='M3.75 9h16.5m-16.5 6.75h16.5'
		/>
	),
	adjustments: () => (
		<path
			stroke-linecap='round'
			stroke-linejoin='round'
			d='M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75'
		/>
	),
	// Status
	check: () => (
		<path
			stroke-linecap='round'
			stroke-linejoin='round'
			d='m4.5 12.75 6 6 9-13.5'
		/>
	),
	info: () => (
		<path
			stroke-linecap='round'
			stroke-linejoin='round'
			d='m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z'
		/>
	),
	exclamation: () => (
		<path
			stroke-linecap='round'
			stroke-linejoin='round'
			d='M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z'
		/>
	),
};
/* ================= SOLID ICONS ================= */

const solidIcons = new Set<IconName>(['bookmarkSolid']);

/* ================= COMPONENT ================= */

export function Icon(props: IconProps) {
  const [local, rest] = splitProps(props, ['name', 'size', 'class']);

  const size = local.size ?? 20;
  const Path = icons[local.name];
  const isSolid = solidIcons.has(local.name);

  return (
		<svg
			{...rest}
			xmlns='http://www.w3.org/2000/svg'
			viewBox='0 0 24 24'
			width={size}
			height={size}
			fill={isSolid ? props.stroke ?? 'currentColor' : 'none'}
			stroke={isSolid ? 'none' : 'currentColor'}
			stroke-width='1.5'
			class={`shrink-0 ${props.class ?? ''}`}
		>
			<Path />
		</svg>
	);
}