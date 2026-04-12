import { JSX } from "solid-js";
import type { Chapter } from "../../shared/types/book";

export function Chapter({chapter, class: className, ...attr}: { chapter: Chapter } & JSX.HTMLAttributes<HTMLElement>) {

	return <article {...attr} class={'chapter ' + className} innerHTML={chapter.html} />;
}
