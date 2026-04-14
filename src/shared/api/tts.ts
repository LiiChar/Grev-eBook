import { invoke } from "@tauri-apps/api/core";

export async function generateTTS(text: string): Promise<string[]> {
	return await invoke('generate_tts_chunks', { text });
}
