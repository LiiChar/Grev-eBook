type HourToken = 'hh' | 'h';
type MinuteToken = 'mm' | 'm';
type SecondToken = 'ss' | 's';
type MillisToken = 'ms';
type Separator = ':' | '.' | '-' | ' ';

type Variant =
	| `${HourToken}${Separator}${MinuteToken}${Separator}${SecondToken}`
	| `${HourToken}${Separator}${MinuteToken}`
	| `${MinuteToken}${Separator}${SecondToken}`
	| `${HourToken}${Separator}${MinuteToken}${Separator}${SecondToken}.${MillisToken}`
	| `${MinuteToken}${Separator}${SecondToken}.${MillisToken}`
	| `${SecondToken}.${MillisToken}`
	| SecondToken
	| MillisToken
	| HourToken
	| MinuteToken;

export const formattedTime = (
	time: number,
	format: 'ms' | 's' | 'm' = 's',
	variant: Variant = 'hh:mm:ss',
): string => {
	let totalMs = time;
	if (format === 's') totalMs = time * 1000;
	if (format === 'm') totalMs = time * 60_000;

	const h = Math.floor(totalMs / 3600000);
	const m = Math.floor((totalMs % 3600000) / 60000);
	const s = Math.floor((totalMs % 60000) / 1000);
	const ms = Math.floor(totalMs % 1000);

	// Для `h` теперь используем паддинг до 2 символов — чтобы при 9 часов получить "09"
	const values: Record<string, string> = {
		hh: String(h).padStart(2, '0'),
		h: String(h).padStart(2, '0'), // было без паддинга — поменял
		mm: String(m).padStart(2, '0'),
		m: String(m),
		ss: String(s).padStart(2, '0'),
		s: String(s),
		ms: String(ms).padStart(3, '0'),
	};

	const tokens = variant.match(/(hh|h|mm|m|ss|s|ms|[^hms]+)/g) || [];

	const resultParts: string[] = [];
	for (const part of tokens) {
		if (part in values) {
			resultParts.push(values[part]);
		} else {
			resultParts.push(part);
		}
	}

	let result = resultParts.join('');

	// Если шаблон использует `h` (не `hh`) и часов == 0 — убираем их вместе с разделителем.
	// Удаляем одну или две ведущие нули и следующий разделитель (если есть).
	if (variant.includes('h') && !variant.includes('hh') && h === 0) {
		result = result.replace(/^0{1,2}[:.\-\s]?/, '');
	}

	return result;
};

type TimeUnit = 'ms' | 's' | 'm' | 'h';

const timeFactors: Record<TimeUnit, number> = {
	ms: 1,
	s: 1000,
	m: 60_000,
	h: 3_600_000,
};

export const convertTime = (
	value: number,
	from: TimeUnit,
	to: TimeUnit,
): number => {
	return (value * timeFactors[from]) / timeFactors[to];
};
