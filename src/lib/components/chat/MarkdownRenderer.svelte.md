# MarkdownRenderer

```svelte
<script lang="ts">
	import { processBlocks, processBlocksSync, type BlockToken } from "$lib/utils/marked";
	import MarkdownWorker from "$lib/workers/markdownWorker?worker";
	import MarkdownBlock from "./MarkdownBlock.svelte";
	import { browser } from "$app/environment";
	import Modal from "../Modal.svelte";

	import { onMount, onDestroy } from "svelte";
	import { updateDebouncer } from "$lib/utils/updates";

	interface Props {
		content: string;
		sources?: { title?: string; link: string }[];
		loading?: boolean;
		onEditCode?: (payload: { originalFenced: string; nextFenced: string }) => void;
	}

	let { content, sources = [], loading = false, onEditCode }: Props = $props();

	let blocks: BlockToken[] = $state([]);
	let worker: Worker | null = null;
	let latestRequestId = 0;

	let showImageModal = $state(false);
	let modalImageSrc: string | null = $state(null);
	let modalImageAlt = $state("");

	function handleContainerClick(event: MouseEvent) {
		const target = event.target as HTMLElement | null;
		const img = target?.closest?.("img") as HTMLImageElement | null;
		if (!img) return;

		// When an image is inside a link, prevent navigation and show the preview instead.
		event.preventDefault();
		event.stopPropagation();

		modalImageSrc = img.currentSrc || img.src;
		modalImageAlt = img.alt ?? "";
		showImageModal = true;
	}

	function handleBlocks(result: BlockToken[], requestId: number) {
		if (requestId !== latestRequestId) return;
		blocks = result;
		updateDebouncer.endRender();
	}

	$effect(() => {
		if (!browser) {
			blocks = processBlocksSync(content, sources);
			return;
		}

		const requestId = ++latestRequestId;

		if (worker) {
			updateDebouncer.startRender();
			worker.postMessage({ type: "process", content, sources, requestId });
			return;
		}

		(async () => {
			updateDebouncer.startRender();
			const processed = await processBlocks(content, sources);
			// Only apply if this is still the latest request
			handleBlocks(processed, requestId);
		})();
	});

	onMount(() => {
		if (typeof Worker !== "undefined") {
			worker = new MarkdownWorker();
			worker.onmessage = (event: MessageEvent) => {
				const data = event.data as { type?: string; blocks?: BlockToken[]; requestId?: number };
				if (data?.type !== "processed" || !data.blocks || data.requestId === undefined) return;
				handleBlocks(data.blocks, data.requestId);
			};
		}
	});

	onDestroy(() => {
		worker?.terminate();
		worker = null;
	});
</script>

{#if showImageModal && modalImageSrc}
	<Modal width="xl:max-w-[90dvw]" onclose={() => (showImageModal = false)}>
		<img
			src={modalImageSrc}
			alt={modalImageAlt}
			class="mx-auto max-h-[90dvh] max-w-[90dvw] object-contain"
		/>
	</Modal>
{/if}

<div onclick={handleContainerClick}>
	{#each blocks as block, index (loading && index === blocks.length - 1 ? `stream-${index}` : block.id)}
		<MarkdownBlock tokens={block.tokens} {loading} {onEditCode} />
	{/each}
</div>
```