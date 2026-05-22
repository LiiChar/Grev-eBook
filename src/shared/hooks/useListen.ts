import { Event, listen } from "@tauri-apps/api/event";
import { onCleanup, onMount } from "solid-js";

export const useListen = <T>(event: string, callback: (event: Event<T>) => void) => {

  onMount(async () => {
      let unlisten = await listen<T>(event, callback);

      onCleanup(() => {
        unlisten();
      });
  });

};