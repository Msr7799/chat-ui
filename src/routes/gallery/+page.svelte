<script lang="ts">
	import { onMount } from "svelte";
	import { base } from "$app/paths";
	import { useAPIClient, handleResponse } from "$lib/APIClient";
	import IconLoading from "$lib/components/icons/IconLoading.svelte";
	import CarbonImage from "~icons/carbon/image";
	import CarbonTrash from "~icons/carbon/trash-can";
	import CarbonClose from "~icons/carbon/close";
	import CarbonDownload from "~icons/carbon/download";
	import ImageGenerationModal from "$lib/components/ImageGenerationModal.svelte";

	interface GeneratedImage {
		_id: string;
		prompt: string;
		url: string;
		width?: number;
		height?: number;
		modelUsed: string;
		createdAt: Date;
	}

	let images = $state<GeneratedImage[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let selectedImage = $state<GeneratedImage | null>(null);
	let isModalOpen = $state(false);
	let deletingId = $state<string | null>(null);

	const client = useAPIClient();

	async function loadImages() {
		loading = true;
		error = null;

		try {
			const response = await client.images.get().then(handleResponse);
			// Map API response to match GeneratedImage type
			images = (response.images || []).map((img: any) => ({
				...img,
				_id: img._id.toString(),
				cloudinaryUrl: img.url,
			}));
		} catch (err) {
			console.error("Failed to load images:", err);
			error = String(err);
		} finally {
			loading = false;
		}
	}

	async function deleteImage(imageId: string) {
		if (!confirm("Are you sure you want to delete this image?")) return;

		deletingId = imageId;

		try {
			await client.images({ imageId }).delete().then(handleResponse);
			images = images.filter((img) => img._id !== imageId);
		} catch (err) {
			console.error("Failed to delete image:", err);
			error = String(err);
		} finally {
			deletingId = null;
		}
	}

	function openImageFullscreen(image: GeneratedImage) {
		selectedImage = image;
	}

	function closeFullscreen() {
		selectedImage = null;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") {
			closeFullscreen();
		}
	}

	function onImageGenerated() {
		loadImages();
	}

	onMount(() => {
		loadImages();
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex h-screen max-h-screen flex-col overflow-hidden">
	<!-- Header -->
	<div
		class="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900"
	>
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Image Gallery</h1>
				<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
					Your AI-generated images with FLUX
				</p>
			</div>
			<button
				type="button"
				class="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-md transition-all hover:bg-blue-700"
				onclick={() => (isModalOpen = true)}
			>
				<span class="flex items-center gap-2">
					<CarbonImage class="text-lg" />
					Generate New
				</span>
			</button>
		</div>
	</div>

	<!-- Content -->
	<div class="flex-1 overflow-y-auto overflow-x-hidden p-6">
		{#if loading}
			<div class="flex h-64 items-center justify-center">
				<IconLoading />
			</div>
		{:else if error}
			<div class="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
				<p class="text-sm text-red-600 dark:text-red-400">
					Error: {error}
				</p>
			</div>
		{:else if images.length === 0}
			<div class="flex h-64 flex-col items-center justify-center text-gray-500 dark:text-gray-400">
				<CarbonImage class="mb-4 text-6xl opacity-50" />
				<p class="text-lg font-medium">No images yet</p>
				<p class="mt-2 text-sm">Click "Generate New" to create your first AI image</p>
			</div>
		{:else}
			<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each images as image (image._id)}
					<div
						class="group relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
					>
						<!-- Image -->
						<button
							type="button"
							class="block w-full overflow-hidden"
							onclick={() => openImageFullscreen(image)}
						>
							<img
								src={image.url}
								alt={image.prompt}
								class="aspect-square w-full object-cover transition-transform group-hover:scale-105"
								loading="lazy"
							/>
						</button>

						<!-- Overlay on hover -->
						<div
							class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100"
						>
							<div class="flex gap-2">
								<button
									type="button"
									class="rounded-lg bg-white p-2 text-gray-900 transition-transform hover:scale-110"
									onclick={() => openImageFullscreen(image)}
									aria-label="View fullscreen"
								>
									<CarbonImage class="text-xl" />
								</button>
								<a
									href={image.url}
									download="generated-image.png"
									class="rounded-lg bg-white p-2 text-gray-900 transition-transform hover:scale-110"
									aria-label="Download"
								>
									<CarbonDownload class="text-xl" />
								</a>
								<button
									type="button"
									class="rounded-lg bg-red-600 p-2 text-white transition-transform hover:scale-110"
									onclick={() => deleteImage(image._id)}
									disabled={deletingId === image._id}
									aria-label="Delete"
								>
									{#if deletingId === image._id}
										<IconLoading />
									{:else}
										<CarbonTrash class="text-xl" />
									{/if}
								</button>
							</div>
							<div class="mt-2 px-4 text-center">
								<span
									class="inline-block rounded-full bg-black/50 px-2 py-1 text-xs text-white backdrop-blur-sm"
								>
									{image.modelUsed || "FLUX.1-schnell"}
								</span>
							</div>
						</div>

						<!-- Info -->
						<div class="p-3">
							<p class="line-clamp-2 text-sm text-gray-700 dark:text-gray-300">
								{image.prompt}
							</p>
							<div
								class="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400"
							>
								<span>{new Date(image.createdAt).toLocaleDateString()}</span>
								<span class="truncate pl-2" title={image.modelUsed}>
									{image.modelUsed ? image.modelUsed.split("/").pop() : "FLUX.1-schnell"}
								</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Fullscreen Image Modal -->
{#if selectedImage}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={closeFullscreen}
		onkeydown={handleKeydown}
	>
		<button
			type="button"
			class="absolute right-4 top-4 rounded-lg bg-white p-2 text-gray-900 shadow-lg transition-transform hover:scale-110 dark:bg-gray-800 dark:text-gray-100"
			onclick={closeFullscreen}
			aria-label="Close"
		>
			<CarbonClose class="text-2xl" />
		</button>

		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			class="max-h-[90vh] max-w-[90vw]"
			role="document"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<img
				src={selectedImage.url}
				alt={selectedImage.prompt}
				class="max-h-[80vh] w-auto rounded-lg shadow-2xl"
			/>
			<div class="mt-4 rounded-lg bg-white p-4 dark:bg-gray-800">
				<p class="text-sm font-medium text-gray-900 dark:text-gray-100">
					{selectedImage.prompt}
				</p>
				<div class="mt-3 flex gap-3">
					<a
						href={selectedImage.url}
						download="generated-image.png"
						class="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-center font-medium text-white transition-colors hover:bg-blue-700"
					>
						Download Image
					</a>
					<button
						type="button"
						class="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
						onclick={closeFullscreen}
					>
						Close
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Image Generation Modal -->
<ImageGenerationModal bind:open={isModalOpen} {onImageGenerated} />

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
