<script lang="ts">
	import { base } from "$app/paths";
	import { useAPIClient, handleResponse } from "$lib/APIClient";
	import IconLoading from "$lib/components/icons/IconLoading.svelte";
	import CarbonClose from "~icons/carbon/close";
	import CarbonImage from "~icons/carbon/image";

	interface Props {
		open?: boolean;
		onClose?: () => void;
		onImageGenerated?: (imageUrl: string) => void;
	}

	let { open = $bindable(false), onClose, onImageGenerated }: Props = $props();

	let prompt = $state("");
	let isGenerating = $state(false);
	let generatedImageUrl = $state<string | null>(null);
	let error = $state<string | null>(null);

	const client = useAPIClient();

	async function generateImage() {
		if (!prompt.trim() || isGenerating) return;

		isGenerating = true;
		error = null;
		generatedImageUrl = null;

		try {
			const response = await client.images
				.generate()
				.post({ prompt: prompt.trim() })
				.then(handleResponse);

			if (response.success && response.image) {
				generatedImageUrl = response.image.url;
				onImageGenerated?.(response.image.url);
			}
		} catch (err) {
			console.error("Image generation failed:", err);
			error = String(err);
		} finally {
			isGenerating = false;
		}
	}

	function closeModal() {
		prompt = "";
		generatedImageUrl = null;
		error = null;
		open = false;
		onClose?.();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") {
			closeModal();
		}
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		role="dialog"
		aria-modal="true"
		onclick={closeModal}
		onkeydown={handleKeydown}
	>
		<div
			class="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
			onclick={(e) => e.stopPropagation()}
			role="document"
		>
			<!-- Header -->
			<div
				class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800"
			>
				<div class="flex items-center gap-3">
					<div class="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
						<CarbonImage class="text-xl text-blue-600 dark:text-blue-400" />
					</div>
					<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
						Generate Image with FLUX
					</h2>
				</div>
				<button
					type="button"
					class="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
					onclick={closeModal}
					aria-label="Close"
				>
					<CarbonClose class="text-xl" />
				</button>
			</div>

			<!-- Content -->
			<div class="space-y-6 p-6">
				<!-- Prompt Input -->
				<div>
					<label
						for="image-prompt"
						class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
					>
						Image Description
					</label>
					<textarea
						id="image-prompt"
						bind:value={prompt}
						placeholder="A beautiful sunset over mountains..."
						rows="3"
						class="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm transition-all placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
						disabled={isGenerating}
						onkeydown={(e) => {
							if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
								generateImage();
							}
						}}
					></textarea>
					<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
						Press Ctrl+Enter to generate • Max 500 characters
					</p>
				</div>

				<!-- Generate Button -->
				<button
					type="button"
					class="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-md transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
					onclick={generateImage}
					disabled={!prompt.trim() || isGenerating}
				>
					{#if isGenerating}
						<span class="flex items-center justify-center gap-2">
							<IconLoading />
							Generating...
						</span>
					{:else}
						Generate Image
					{/if}
				</button>

				<!-- Error Message -->
				{#if error}
					<div class="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
						<p class="text-sm text-red-600 dark:text-red-400">
							{error}
						</p>
					</div>
				{/if}

				<!-- Generated Image -->
				{#if generatedImageUrl}
					<div class="space-y-4">
						<div class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
							<img src={generatedImageUrl} alt={prompt} class="w-full" />
						</div>
						<div class="flex gap-3">
							<a
								href={generatedImageUrl}
								download="generated-image.png"
								class="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-center font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
							>
								Download
							</a>
							<a
								href="{base}/gallery"
								class="flex-1 rounded-lg bg-gray-900 px-4 py-2 text-center font-medium text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
							>
								View Gallery
							</a>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	/* Custom scrollbar for the modal */
	div[role="document"] {
		scrollbar-width: thin;
		scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
	}

	div[role="document"]::-webkit-scrollbar {
		width: 8px;
	}

	div[role="document"]::-webkit-scrollbar-track {
		background: transparent;
	}

	div[role="document"]::-webkit-scrollbar-thumb {
		background-color: rgba(156, 163, 175, 0.5);
		border-radius: 4px;
	}
</style>
