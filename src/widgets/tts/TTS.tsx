import { generateTTS } from "@/shared/api/tts";
import { listen } from "@tauri-apps/api/event";
import { onMount } from "solid-js";

export const TTS = () => {
  onMount(async () => {
    // const utterance = new SpeechSynthesisUtterance('Привет, это тест генерации речи из текста в приложении Grev. Наслаждайтесь чтением и прослушиванием своих книг!');
		// speechSynthesis.speak(utterance);
    // await generateTTS("Привет, это тест генерации речи из текста в приложении Grev. Наслаждайтесь чтением и прослушиванием своих книг!");
    // listen('tts_chunk_generated', event => {
		// 	const chunkPath = event.payload as string;
		// 	console.log('Получен новый аудиофайл TTS:', chunkPath);
		// });
  });


  return (
		<div class='flex flex-col gap-2 p-4 rounded-lg border border-[var(--border)]'>
			<div class='flex gap-2 items-center'>
				<div class='w-8 h-8 rounded-full bg-[var(--surface-hover)]'></div>
				<div class='text-sm text-[var(--foreground-muted)]'>
					<span class='font-medium'>Скорость</span>
					<span class='text-xs text-[var(--foreground-muted)]'>
						Скорость речи
					</span>
				</div>
			</div>
			
		</div>
	);
}