<script lang="ts">
	import { base } from "$app/paths";
	import { useAPIClient, handleResponse } from "$lib/APIClient";
	import IconLoading from "$lib/components/icons/IconLoading.svelte";
	import Portal from "$lib/components/Portal.svelte";
	import CarbonClose from "~icons/carbon/close";
	import CarbonImage from "~icons/carbon/image";
	import CarbonUpload from "~icons/carbon/upload";

	interface Props {
		open?: boolean;
		onClose?: () => void;
		onImageGenerated?: (imageUrl: string) => void;
	}

	let { open = $bindable(false), onClose, onImageGenerated }: Props = $props();

	// Supported models (HuggingFace)
	const HF_MODELS = [
		{ id: "black-forest-labs/FLUX.1-schnell", name: "FLUX.1-schnell (Fast & High Quality)" },
		{
			id: "stabilityai/stable-diffusion-xl-base-1.0",
			name: "Stable Diffusion XL (Open Source Leader)",
		},
		{ id: "ByteDance/SDXL-Lightning", name: "SDXL-Lightning (Ultra Fast)" },
		{ id: "stabilityai/stable-diffusion-2-1", name: "Stable Diffusion 2.1 (Lightweight)" },
		{
			id: "playgroundai/playground-v2.5-1024px-aesthetic",
			name: "Playground v2.5 (Aesthetic Focused)",
		},
	];

	type Provider = "huggingface" | "google";

	let provider = $state<Provider>("google");
	let googleModels = $state<Array<{ id: string; created?: number }>>([]);
	let isLoadingGoogleModels = $state(false);
	let googleModelsError = $state<string | null>(null);

	let prompt = $state("");
	let selectedModel = $state(HF_MODELS[0].id);
	let isGenerating = $state(false);
	let generatedImageUrl = $state<string | null>(null);
	let error = $state<string | null>(null);
	let referenceImage = $state<{ data: string; mimeType: string } | null>(null);
	let referencePreviewUrl = $state<string | null>(null);

	const client = useAPIClient();

	async function loadGoogleModels() {
		if (isLoadingGoogleModels) return;
		isLoadingGoogleModels = true;
		googleModelsError = null;
		try {
			const res = await client.images.google.models.get();
			const data = handleResponse(res) as { models: Array<{ id: string; created?: number }> };
			googleModels = (data.models || [])
				.filter((m) => typeof m.id === "string" && m.id.includes("image"))
				.sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
			if (provider === "google" && googleModels.length > 0) {
				selectedModel = googleModels[0].id;
			}
		} catch (err: any) {
			googleModelsError = String(err);
		} finally {
			isLoadingGoogleModels = false;
		}
	}

	async function generateImage() {
		if (!prompt.trim() || isGenerating) return;

		isGenerating = true;
		error = null;
		generatedImageUrl = null;

		try {
			console.log("Sending request with provider/model:", provider, selectedModel);
			const rawResponse =
				provider === "google"
					? await client.images.google.generate.post({
							prompt: prompt.trim(),
							model: selectedModel,
							referenceImage: referenceImage ?? undefined,
						})
					: await client.images.generate.post({
							prompt: prompt.trim(),
							model: selectedModel,
						});
			console.log("Raw response received:", rawResponse);

			const response = handleResponse(rawResponse) as {
				success: boolean;
				image: { url: string; [key: string]: any };
			};
			console.log("Parsed response:", response);

			if (response?.success && response?.image) {
				generatedImageUrl = response.image.url;
				onImageGenerated?.(response.image.url);
			} else {
				// Even if we can't display it here, if we have success, try to reload gallery
				if (response?.success) {
					onImageGenerated?.("");
				}
				console.error("Invalid response structure:", response);
				throw new Error("Invalid response format. See console for details.");
			}
		} catch (err: any) {
			console.error("Image generation failed:", err);
			error = String(err);
		} finally {
			isGenerating = false;
		}
	}

	function setProvider(next: Provider) {
		provider = next;
		generatedImageUrl = null;
		error = null;
		if (provider !== "google") {
			if (referencePreviewUrl) {
				URL.revokeObjectURL(referencePreviewUrl);
			}
			referencePreviewUrl = null;
			referenceImage = null;
		}
		if (provider === "huggingface") {
			selectedModel = HF_MODELS[0].id;
		} else {
			if (googleModels.length > 0) {
				selectedModel = googleModels[0].id;
			} else {
				loadGoogleModels();
			}
		}
	}

	function onProviderChange(e: Event) {
		const el = e.currentTarget as HTMLSelectElement | null;
		if (!el) return;
		setProvider(el.value as Provider);
	}

	function closeModal() {
		prompt = "";
		generatedImageUrl = null;
		error = null;
		if (referencePreviewUrl) {
			URL.revokeObjectURL(referencePreviewUrl);
		}
		referencePreviewUrl = null;
		referenceImage = null;
		open = false;
		onClose?.();
	}

	async function onReferenceFileChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement | null;
		const file = input?.files?.[0];
		if (!file) return;
		if (!file.type.startsWith("image/")) {
			referenceImage = null;
			referencePreviewUrl = null;
			error = "Please select an image file";
			return;
		}
		error = null;
		referencePreviewUrl = URL.createObjectURL(file);
		const dataUrl = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result || ""));
			reader.onerror = () => reject(reader.error);
			reader.readAsDataURL(file);
		});
		referenceImage = { data: dataUrl, mimeType: file.type };
	}

	function clearReferenceImage() {
		if (referencePreviewUrl) {
			URL.revokeObjectURL(referencePreviewUrl);
		}
		referencePreviewUrl = null;
		referenceImage = null;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") {
			closeModal();
		}
	}

	$effect(() => {
		if (!open) return;
		// Preload Google models when modal opens (to keep UX snappy).
		if (googleModels.length === 0 && !isLoadingGoogleModels) {
			loadGoogleModels();
		}
		// Ensure selection is consistent
		if (provider === "google" && googleModels.length > 0 && !selectedModel.includes("image")) {
			selectedModel = googleModels[0].id;
		}
	});
</script>

{#if open}
	<Portal>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			onclick={closeModal}
			onkeydown={handleKeydown}
		>
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<div
				class="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
				onclick={(e) => e.stopPropagation()}
				role="document"
				tabindex="0"
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
							for="image-provider"
							class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Provider
						</label>
						<select
							id="image-provider"
							bind:value={provider}
							disabled={isGenerating}
							class="mb-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
							onchange={onProviderChange}
						>
							<option value="google">Google AI Studio</option>
							<option value="huggingface">HuggingFace</option>
						</select>

						<label
							for="image-model"
							class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Select Model
						</label>
						<select
							id="image-model"
							bind:value={selectedModel}
							disabled={isGenerating}
							class="mb-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
						>
							{#if provider === "google"}
								{#if isLoadingGoogleModels}
									<option value={selectedModel}>Loading Google models...</option>
								{:else}
									{#each googleModels as model}
										<option value={model.id}>{model.id}</option>
									{/each}
								{/if}
							{:else}
								{#each HF_MODELS as model}
									<option value={model.id}>{model.name}</option>
								{/each}
							{/if}
						</select>

						{#if provider === "google" && googleModelsError}
							<div class="mb-4 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
								<p class="text-sm text-red-600 dark:text-red-400">
									{googleModelsError}
								</p>
							</div>
						{/if}

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

						{#if provider === "google"}
							<div class="mt-4">
								<div class="mb-2 flex items-center justify-between">
									<p class="text-sm font-medium text-gray-700 dark:text-gray-300">
										Reference image (optional)
									</p>
									{#if referencePreviewUrl}
										<button
											type="button"
											class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
											onclick={clearReferenceImage}
										>
											Remove
										</button>
									{/if}
								</div>
								{#if referencePreviewUrl}
									<div
										class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
									>
										<img
											src={referencePreviewUrl}
											alt="Reference"
											class="max-h-48 w-full object-contain"
										/>
									</div>
								{:else}
									<label
										class="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
									>
										<CarbonUpload class="text-lg" />
										<span>Upload a reference image</span>
										<input
											type="file"
											accept="image/*"
											class="hidden"
											onchange={onReferenceFileChange}
											disabled={isGenerating}
										/>
									</label>
								{/if}
							</div>
						{/if}
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
	</Portal>
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
