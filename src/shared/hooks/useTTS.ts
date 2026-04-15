import { createSignal, onMount, onCleanup } from 'solid-js';

type UseTTSProps = {
	text?: string;
	target?: string;
	autoplay?: boolean;
	chunkSize?: number; // длина чанка
};

export const useTTS = ({
	text,
	target,
	autoplay,
	chunkSize = 200,
}: UseTTSProps) => {
	const [textToSpeak, setTextToSpeak] = createSignal(text ?? '');
	const [chunks, setChunks] = createSignal<string[]>([]);
	const [currentIndex, setCurrentIndex] = createSignal(0);

	const [playing, setPlaying] = createSignal(false);
	const [volume, setVolume] = createSignal(1);
	const [rate, setRate] = createSignal(1);
	const [pitch, setPitch] = createSignal(1);

	const [currentWord, setCurrentWord] = createSignal('');
	const [progress, setProgress] = createSignal(0);

	let utterance: SpeechSynthesisUtterance | null = null;

	// 🔹 Разбивка текста
	const splitText = (text: string) => {
		const result: string[] = [];
		let i = 0;

		while (i < text.length) {
			result.push(text.slice(i, i + chunkSize));
			i += chunkSize;
		}

		return result;
	};

	const buildUtterance = (chunk: string) => {
		const u = new SpeechSynthesisUtterance(chunk);

		u.volume = volume();
		u.rate = rate();
		u.pitch = pitch();

		u.onstart = () => setPlaying(true);
		u.onend = () => {
			next();
		};

		u.onerror = () => setPlaying(false);

		// 🔥 текущее слово
		u.onboundary = (event: SpeechSynthesisEvent) => {
			if (event.name === 'word') {
				const word = chunk.slice(event.charIndex).split(' ')[0];
				setCurrentWord(word);

				const totalChars =
					chunks().slice(0, currentIndex()).join('').length + event.charIndex;

				const percent = totalChars / textToSpeak().length;
				setProgress(percent);
			}
		};

		return u;
	};

	const speakCurrent = () => {
		const chunk = chunks()[currentIndex()];
		if (!chunk) return;

		utterance = buildUtterance(chunk);
		speechSynthesis.speak(utterance);
	};

	const play = () => {
		if (speechSynthesis.paused) {
			speechSynthesis.resume();
			setPlaying(true);
			return;
		}

		speechSynthesis.cancel();
		speakCurrent();
	};

	const pause = () => {
		speechSynthesis.pause();
		setPlaying(false);
	};

	const stop = () => {
		speechSynthesis.cancel();
		setPlaying(false);
		setCurrentIndex(0);
		setProgress(0);
	};

	const next = () => {
		const nextIndex = currentIndex() + 1;

		if (nextIndex >= chunks().length) {
			setPlaying(false);
			return;
		}

		setCurrentIndex(nextIndex);
		speakCurrent();
	};

	const prev = () => {
		const prevIndex = currentIndex() - 1;

		if (prevIndex < 0) return;

		setCurrentIndex(prevIndex);
		speakCurrent();
	};

	const changeVolume = (v: number) => {
		setVolume(v);
		if (utterance) utterance.volume = v;
	};

	const changeRate = (r: number) => {
		setRate(r);
		if (utterance) utterance.rate = r;
	};

	const changePitch = (p: number) => {
		setPitch(p);
		if (utterance) utterance.pitch = p;
	};

	// 🔹 инициализация
	onMount(() => {
		let finalText = textToSpeak();

		if (target && !finalText) {
			const el = document.querySelector(target);
			finalText = el?.textContent ?? '';
			setTextToSpeak(finalText);
		}

		const preparedChunks = splitText(finalText);
		setChunks(preparedChunks);

		if (autoplay) {
			speakCurrent();
		}
	});

	onCleanup(() => {
		speechSynthesis.cancel();
	});

	return {
		// state
		playing,
		volume,
		rate,
		pitch,
		currentWord,
		progress,
		currentIndex,
		chunks,

		// controls
		play,
		pause,
		stop,
		next,
		prev,

		changeVolume,
		changeRate,
		changePitch,

		// utils
		setText: (t: string) => {
			stop();
			setTextToSpeak(t);
			setChunks(splitText(t));
		},
	};
};
