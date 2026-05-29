import { getRussianPlural } from "./date";

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

export const formattedTimeText = (
	time: number,
	format: 'ms' | 's' | 'm' = 's',
): string => {
	let totalMs = time;

	if (format === 's') totalMs *= 1000;
	if (format === 'm') totalMs *= 60_000;

	const days = Math.floor(totalMs / 86_400_000);
	const hours = Math.floor((totalMs % 86_400_000) / 3_600_000);
	const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
	const seconds = Math.floor((totalMs % 60_000) / 1000);

	const parts: string[] = [];

	if (days > 0) {
		parts.push(`${days} ${getRussianPlural(days, ['день', 'дня', 'дней'])}`);
	}

	if (hours > 0) {
		parts.push(`${hours} ${getRussianPlural(hours, ['час', 'часа', 'часов'])}`);
	}

	if (minutes > 0) {
		parts.push(
			`${minutes} ${getRussianPlural(minutes, ['минута', 'минуты', 'минут'])}`,
		);
	}

	if (seconds > 0) {
		parts.push(
			`${seconds} ${getRussianPlural(seconds, ['секунда', 'секунды', 'секунд'])}`,
		);
	}

	if (!parts.length) {
		return 'меньше секунды';
	}

	// Ограничиваем двумя крупнейшими единицами
	return parts.slice(0, 2).join(' ');
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
