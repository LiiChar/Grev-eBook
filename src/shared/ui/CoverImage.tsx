import { createSignal, onMount, Show, type Component, type JSX } from "solid-js";
import { getCachedCoverUrl } from "../api/cover";

type CoverImageProps = {
  bookId: string;
  bookPath: string;
  alt?: string;
  class?: string;
  loading?: "lazy" | "eager";
  onError?: () => void;
  children?: JSX.Element;
};

/**
 * Lazy-loading cover image component.
 * Fetches cover from backend via Tauri command, caches it.
 * Shows a fallback placeholder while loading.
 */
export const CoverImage: Component<CoverImageProps> = (props) => {
  const [coverUrl, setCoverUrl] = createSignal<string | null>(null);
  const [hasError, setHasError] = createSignal(false);

  onMount(async () => {
    try {
      const url = await getCachedCoverUrl(props.bookId, props.bookPath);
      if (url) {
        setCoverUrl(url);
      } else {
        setHasError(true);
      }
    } catch {
      setHasError(true);
    }
  });

  return (
    <Show
      when={coverUrl() && !hasError()}
      fallback={props.children}
    >
      <img
        src={coverUrl()!}
        alt={props.alt || ""}
        class={props.class}
        loading={props.loading || "lazy"}
        onError={() => {
          setHasError(true);
          props.onError?.();
        }}
      />
    </Show>
  );
};
