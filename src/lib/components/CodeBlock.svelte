<script lang="ts">
	import CopyToClipBoardBtn from "./CopyToClipBoardBtn.svelte";
	import DOMPurify from "isomorphic-dompurify";
	import HtmlPreviewModal from "./HtmlPreviewModal.svelte";
	import Modal from "./Modal.svelte";
	import PlayFilledAlt from "~icons/carbon/play-filled-alt";
	import CarbonEdit from "~icons/carbon/edit";
	import EosIconsLoading from "~icons/eos-icons/loading";

	interface Props {
		code?: string;
		rawCode?: string;
		fencedRaw?: string;
		loading?: boolean;
		onapply?: (payload: { originalFenced: string; nextFenced: string }) => void;
	}

	let { code = "", rawCode = "", fencedRaw = "", loading = false, onapply }: Props = $props();

	let previewOpen = $state(false);
	let editOpen = $state(false);
	let editedCode = $state("");
	let originalFenced = $state("");

	function buildNextFenced(original: string, nextCode: string): string {
		const originalText = original ?? "";
		const trimmedNext = (nextCode ?? "").replace(/\r\n/g, "\n");
		const opening = originalText.match(/^([`~]{3,})([^\n]*)\n/);
		if (!opening) {
			const fence = "```";
			return `${fence}\n${trimmedNext}\n${fence}\n`;
		}
		const fence = opening[1] ?? "```";
		const info = (opening[2] ?? "").trimEnd();
		const header = `${fence}${info ? info : ""}`;
		return `${header}\n${trimmedNext}\n${fence}\n`;
	}

	function applyAndClose() {
		const original = originalFenced || fencedRaw || "";
		const nextFenced = buildNextFenced(original, editedCode);
		if (original && nextFenced && original !== nextFenced) {
			onapply?.({ originalFenced: original, nextFenced });
		}
		editOpen = false;
	}

	function openEditor() {
		editedCode = rawCode;
		originalFenced = fencedRaw;
		editOpen = true;
	}

	function hasStrictHtml5Doctype(input: string): boolean {
		if (!input) return false;
		const withoutBOM = input.replace(/^\uFEFF/, "");
		const trimmed = withoutBOM.trimStart();
		// Strict HTML5 doctype: <!doctype html> with optional whitespace before >
		return /^<!doctype\s+html\s*>/i.test(trimmed);
	}

	function isSvgDocument(input: string): boolean {
		const trimmed = input.trimStart();
		return /^(?:<\?xml[^>]*>\s*)?(?:<!doctype\s+svg[^>]*>\s*)?<svg[\s>]/i.test(trimmed);
	}

	let showPreview = $derived(hasStrictHtml5Doctype(rawCode) || isSvgDocument(rawCode));
</script>

<div class="group relative my-4 rounded-lg">
	<div class="pointer-events-none sticky top-0 w-full">
		<div
			class="pointer-events-auto absolute right-2 top-2 flex items-center gap-1.5 md:right-3 md:top-3"
		>
			<button
				class="btn h-7 gap-1 rounded-lg border px-2 text-xs shadow-sm backdrop-blur transition-none hover:border-gray-500 active:shadow-inner disabled:cursor-not-allowed disabled:opacity-80 dark:border-gray-600 dark:bg-gray-600/50 dark:hover:border-gray-500"
				disabled={loading}
				onclick={() => {
					if (!loading) {
						openEditor();
					}
				}}
				title="Edit code"
				aria-label="Edit code"
			>
				<CarbonEdit class="size-3.5" />
				Edit
			</button>
			{#if showPreview}
				<button
					class="btn h-7 gap-1 rounded-lg border px-2 text-xs shadow-sm backdrop-blur transition-none hover:border-gray-500 active:shadow-inner disabled:cursor-not-allowed disabled:opacity-80 dark:border-gray-600 dark:bg-gray-600/50 dark:hover:border-gray-500"
					disabled={loading}
					onclick={() => {
						if (!loading) {
							previewOpen = true;
						}
					}}
					title="Preview HTML"
					aria-label="Preview HTML"
				>
					{#if loading}
						<EosIconsLoading class="size-3.5" />
					{:else}
						<PlayFilledAlt class="size-3.5" />
					{/if}
					Preview
				</button>
			{/if}
			<CopyToClipBoardBtn
				iconClassNames="size-3"
				classNames="btn transition-none rounded-lg border size-7 text-sm shadow-sm dark:bg-gray-600/50 backdrop-blur dark:hover:border-gray-500  active:shadow-inner dark:border-gray-600  hover:border-gray-500"
				value={rawCode}
			/>
		</div>
	</div>
	<pre
		class="scrollbar-custom overflow-auto px-5 font-mono transition-[height]"
		ondblclick={() => {
			if (!loading) {
				openEditor();
			}
		}}><code><!-- eslint-disable svelte/no-at-html-tags -->{@html DOMPurify.sanitize(code)}</code
		></pre>

	{#if previewOpen}
		<HtmlPreviewModal html={rawCode} onclose={() => (previewOpen = false)} />
	{/if}

	{#if editOpen}
		<Modal width="max-w-4xl" closeButton onclose={() => applyAndClose()}>
			<div class="p-4">
				<div class="flex items-center justify-between gap-2">
					<div class="text-sm font-semibold text-gray-900 dark:text-gray-100">Edit code</div>
					<CopyToClipBoardBtn
						classNames="btn h-8 rounded-lg border px-3 text-sm shadow-sm dark:bg-gray-600/50 backdrop-blur dark:hover:border-gray-500 active:shadow-inner dark:border-gray-600 hover:border-gray-500"
						value={editedCode}
					>
						{#snippet children()}
							<span class="text-sm">Copy</span>
						{/snippet}
					</CopyToClipBoardBtn>
				</div>
				<textarea
					class="mt-3 h-[70dvh] w-screen resize-none rounded-lg border border-gray-200 bg-white p-3 font-mono text-sm text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
					bind:value={editedCode}
					spellcheck="false"
				></textarea>
			</div>
		</Modal>
	{/if}
</div>
