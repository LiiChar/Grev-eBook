export const getYear = (dateStr: string): number => {
	const date = new Date(dateStr);
	return date.getFullYear();
};

export const getMonth = (dateStr?: string): number => {
	const date = new Date(dateStr ?? new Date());
	return date.getMonth();
};

export const getCurrentDateAtMinute = (minutes: number): string => {
	const allMinutes = new Date().getMinutes() - minutes;
	const date = new Date();
	date.setMinutes(allMinutes);
	// .2024-11-14 16:23:50
	return `${date.getFullYear()}-${
		date.getMonth() + 1
	}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
};

export const getDate = (date: string): string => {
	return new Date(date).toLocaleDateString('ru-RU', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
};

export function getFormattedDate(
	format: string,
	date: Date = new Date(),
): string {
	const day = date.getDate();
	const month = date.getMonth() + 1;
	const year = date.getFullYear();
	const hours24 = date.getHours();
	const minutes = date.getMinutes();
	const seconds = date.getSeconds();
	const ampm = hours24 >= 12 ? 'PM' : 'AM';

	const formattedDate = format
		.replace('d', String(day).padStart(2, '0')) // День (двузначный)
		.replace('m', String(month).padStart(2, '0')) // Месяц (двузначный)
		.replace('y', String(year)) // Год
		.replace('h', String(hours24).padStart(2, '0')) // Часы (24-часовой формат)
		.replace('i', String(minutes).padStart(2, '0')) // Минуты
		.replace('s', String(seconds).padStart(2, '0')) // Секунды
		.replace('a', ampm); // AM/PM

	return formattedDate;
}

export function daysInMonth(month: number, year: number) {
	return new Date(year, month, 0).getDate();
}

export const tsToDate = (ts: number) => new Date(ts);

export const getDaysFromYear = (year: number) => {
	return (year % 4 === 0 && year % 100 > 0) || year % 400 == 0 ? 366 : 365;
};

export const getTime = (sec: number): string => {
	let time = '';
	if (sec / 360 >= 1) {
		time += Math.floor(sec / 360);
		time += ':';
		sec = sec % 360;
	}
	if (sec / 60 >= 1) {
		time += Math.floor(sec / 60);
		time += ':';
		sec = sec % 60;
	} else {
		time += 0;
		time += ':';
	}
	if (sec <= 10) {
		time += 0;
	}
	time += Math.trunc(sec);
	return time;
};

export const getMonthDayFromDayOfYear = (year: number, dayOfYear: number) => {
	// Создаем новый объект Date, передавая в конструктор год, 0-й месяц и день (также можно передать 1-е января года)
	const date = new Date(year, 0, 3); // 0-й день отсчитывается от 1970 года, так что это день перед 1 января year года
	date.setDate(dayOfYear + 1); // Устанавливаем нужный день от начала года

	// Получаем месяц и день из объекта Date
	const month = date.getMonth(); // Месяцы отсчитываются от 0, поэтому добавляем 1
	const day = date.getDate();

	return [month, day];
};
export const getTimeAgo = (date: Date | string | number) => {
	const now = new Date();
	const messageTime = new Date(date);

	const timeDifference = now.getTime() - messageTime.getTime();
	const seconds = Math.floor(timeDifference / 1000);
	const minutes = Math.floor(seconds / 60) + new Date().getTimezoneOffset();
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);
	const months = Math.floor(days / 30);
	const years = Math.floor(days / 365);

	if (years > 0) {
		return `${years} ${getRussianPlural(years, ['год', 'года', 'лет'])} назад`;
	} else if (months > 0) {
		return `${months} ${getRussianPlural(months, [
			'месяц',
			'месяца',
			'месяцев',
		])} назад`;
	} else if (days > 7) {
		const weeks = Math.floor(days / 7);
		return `${weeks} ${getRussianPlural(weeks, [
			'неделю',
			'недели',
			'недель',
		])} назад`;
	} else if (days > 0) {
		return `${days} ${getRussianPlural(days, ['день', 'дня', 'дней'])} назад`;
	} else if (hours > 0) {
		return `${hours} ${getRussianPlural(hours, ['час', 'часа', 'часов'])} назад`;
	} else if (minutes > 0) {
		return `${minutes} ${getRussianPlural(minutes, [
			'минуту',
			'минуты',
			'минут',
		])} назад`;
	} else {
		return 'меньше минуты назад';
	}
};

function getRussianPlural(number: number, titles: [string, string, string]) {
	const cases = [2, 0, 1, 1, 1, 2];
	return titles[
		number % 100 > 4 && number % 100 < 20
			? 2
			: cases[number % 10 < 5 ? number % 10 : 5]
	];
}

export const timer = async (time: number) => {
	return new Promise(res => {
		setTimeout(() => {
			res('');
		}, time);
	});
};

export const getDayOfYear = (dates: Date | string) => {
	const date = new Date(dates);

	const start = new Date(date.getFullYear(), 0, 0);
	const diff = date.getTime() - start.getTime();
	const oneDay = 1000 * 60 * 60 * 24;
	const dayOfYear = Math.floor(diff / oneDay);
	return dayOfYear;
};
