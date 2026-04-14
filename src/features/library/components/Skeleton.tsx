import { Skeleton } from "@/shared/ui/Skeleton";
import { Accessor, For, Show } from "solid-js";

export const SkeletonLibrary = ({loading}: {loading: Accessor<boolean>}) => {
  return (
    <Show when={loading()}>
      <div class='grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-4 w-full h-full'>
        <For each={Array(10)}>{() => <Skeleton class="w-full h-full aspect-[18/14]" />}</For>
      </div>
    </Show>
	);
}