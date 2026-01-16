<script lang="ts">
	import { onMount } from "svelte";
	import { base } from "$app/paths";
	import { page } from "$app/stores";
	import { useAPIClient, handleResponse } from "$lib/APIClient";
	import IconLoading from "$lib/components/icons/IconLoading.svelte";
	import IconGoogleVideo from "$lib/components/icons/IconGoogleVideo.svelte";
	import IconPrompt from "$lib/components/icons/IconPrompt.svelte";
	import IconKey from "$lib/components/icons/IconKey.svelte";
	import CarbonDownload from "~icons/carbon/download";
	import CarbonCopy from "~icons/carbon/copy";
	import CarbonTrash from "~icons/carbon/trash-can";
	import CarbonClose from "~icons/carbon/close";
	import CarbonUpload from "~icons/carbon/upload";
	import CarbonChevronRight from "~icons/carbon/chevron-right";

	type GoogleModel = { id: string; created?: number };
	type GeneratedImage = {
		_id: string;
		prompt: string;
		url: string;
		width?: number;
		height?: number;
		modelUsed: string;
		createdAt: Date;
	};

	const client = useAPIClient();
	const PROMPT_HISTORY_KEY = "google_images_prompt_history";
	const starterImages = [
		{ url: "/google_studio_page/1.png", prompt: "Starter image 1" },
		{ url: "/google_studio_page/2.webp", prompt: "Starter image 2" },
		{ url: "/google_studio_page/3.webp", prompt: "Starter image 3" },
		{ url: "/google_studio_page/4.webp", prompt: "Starter image 4" },
		{ url: "/google_studio_page/5.png", prompt: "Starter image 5" },
		{ url: "/google_studio_page/6.webp", prompt: "Starter image 6" },
	] as const;

	let models = $state<GoogleModel[]>([]);
	let isLoadingModels = $state(false);
	let modelsError = $state<string | null>(null);
	let prompt = $state("");
	let selectedModel = $state<string>("");
	let isGenerating = $state(false);
	let generatedImageUrl = $state<string | null>(null);
	let generateError = $state<string | null>(null);
	let referenceImage = $state<{ data: string; mimeType: string } | null>(null);
	let referencePreviewUrl = $state<string | null>(null);
	let recentImages = $state<GeneratedImage[]>([]);
	let isLoadingRecent = $state(false);
	let recentError = $state<string | null>(null);
	let lightboxImage = $state<GeneratedImage | null>(null);
	let referenceFileInput = $state<HTMLInputElement | null>(null);
	let lastGenerated = $state<GeneratedImage | null>(null);
	let deletingId = $state<string | null>(null);
	let copyStatus = $state<string | null>(null);
	let isModelMenuOpen = $state(false);
	let modelMenuRoot = $state<HTMLDivElement | null>(null);
	let isPromptHistoryOpen = $state(false);
	let promptHistoryRoot = $state<HTMLDivElement | null>(null);
	let promptHistory = $state<string[]>([]);
	let isPromptEnhancerOpen = $state(false);
	let isImprovingPrompt = $state(false);
	let improvePromptError = $state<string | null>(null);
	let improvedPromptFull = $state<string>("");
	let improvedPromptTyping = $state<string>("");
	let originalPromptBeforeImprove = $state<string>("");
	let typingTimer: ReturnType<typeof setInterval> | null = null;

	let isGoogleKeyOpen = $state(false);
	let googleKeyInput = $state("");
	let showGoogleKey = $state(false);
	let savingGoogleKey = $state(false);
	let googleKeyError = $state<string | null>(null);
	let googleKeySaved = $state(false);

	async function saveGoogleKey() {
		savingGoogleKey = true;
		googleKeyError = null;
		googleKeySaved = false;
		try {
			const res = await fetch(`${base}/api/config`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ GEMINI_API_KEY: googleKeyInput }),
			});
			if (!res.ok) {
				const t = await res.text().catch(() => "");
				throw new Error(t || `HTTP ${res.status}`);
			}
			googleKeySaved = true;
			setTimeout(() => (googleKeySaved = false), 2000);
		} catch (e: any) {
			googleKeyError = String(e?.message ?? e);
		} finally {
			savingGoogleKey = false;
		}
	}

	function isGoogleImage(img: { modelUsed?: string }) {
		const m = img.modelUsed ?? "";
		return m.startsWith("gemini-") && m.includes("image");
	}

	function normalizeModelId(id: string) {
		return id.replace(/^models\//, "");
	}

	async function setReferenceFromFile(file: File) {
		if (!file.type.startsWith("image/")) {
			generateError = "Please select an image file";
			return;
		}
		generateError = null;
		if (referencePreviewUrl) {
			URL.revokeObjectURL(referencePreviewUrl);
		}
		referencePreviewUrl = URL.createObjectURL(file);
		const dataUrl = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result || ""));
			reader.onerror = () => reject(reader.error);
			reader.readAsDataURL(file);
		});
		referenceImage = { data: dataUrl, mimeType: file.type };
	}

	function getModelDisplayName(id: string) {
		const n = normalizeModelId(id);
		const cleaned = n.replace(/[:]/g, " ").replace(/_/g, "-");
		if (cleaned.startsWith("gemini-")) {
			return cleaned
				.replace(/^gemini-/, "Gemini ")
				.replace(/-image-(generation|preview)/g, "")
				.replace(/-image/g, "")
				.replace(/-exp\b/g, " Exp")
				.replace(/-pro\b/g, " Pro")
				.replace(/-flash\b/g, " Flash")
				.replace(/\s+/g, " ")
				.replace(/-/g, " ")
				.trim();
		}
		if (cleaned.startsWith("imagen-")) {
			return cleaned
				.replace(/^imagen-/, "Imagen ")
				.replace(/-generate-preview/g, "")
				.replace(/-fast\b/g, " Fast")
				.replace(/-ultra\b/g, " Ultra")
				.replace(/\s+/g, " ")
				.replace(/-/g, " ")
				.trim();
		}
		return cleaned.replace(/-/g, " ").trim();
	}

	function modelHasVision(id: string) {
		const n = normalizeModelId(id).toLowerCase();
		return n.includes("vision") || n.includes("image-preview") || n.includes("pro-image-preview");
	}

	function modelHas4k(id: string) {
		const n = normalizeModelId(id).toLowerCase();
		return n.includes("imagen-4") || n.includes("ultra");
	}

	function isBananaModel(id: string) {
		return normalizeModelId(id).toLowerCase().includes("banana");
	}

	function toggleModelMenu() {
		if (isGenerating || isLoadingModels) return;
		isModelMenuOpen = !isModelMenuOpen;
	}

	function selectModel(id: string) {
		selectedModel = id;
		isModelMenuOpen = false;
	}

	function onDocumentPointerDown(e: Event) {
		const target = e.target as Node | null;
		if (isModelMenuOpen && modelMenuRoot && target && !modelMenuRoot.contains(target)) {
			isModelMenuOpen = false;
		}
		if (isPromptHistoryOpen && promptHistoryRoot && target && !promptHistoryRoot.contains(target)) {
			isPromptHistoryOpen = false;
		}
	}

	function loadPromptHistory() {
		if (typeof localStorage === "undefined") return;
		try {
			const raw = localStorage.getItem(PROMPT_HISTORY_KEY);
			const parsed = raw ? (JSON.parse(raw) as unknown) : [];
			if (Array.isArray(parsed)) {
				promptHistory = parsed
					.map((x) => String(x))
					.filter(Boolean)
					.slice(0, 5);
			}
		} catch {
			promptHistory = [];
		}
	}

	function savePromptHistory(next: string[]) {
		promptHistory = next;
		if (typeof localStorage === "undefined") return;
		try {
			localStorage.setItem(PROMPT_HISTORY_KEY, JSON.stringify(next));
		} catch {}
	}

	function addPromptToHistory(p: string) {
		const v = String(p || "").trim();
		if (!v) return;
		const next = [v, ...promptHistory.filter((x) => x !== v)].slice(0, 5);
		savePromptHistory(next);
	}

	function togglePromptHistory() {
		isPromptHistoryOpen = !isPromptHistoryOpen;
		if (isPromptHistoryOpen) {
			isModelMenuOpen = false;
		}
	}

	function selectPromptFromHistory(p: string) {
		prompt = p;
		isPromptHistoryOpen = false;
	}

	async function copyImageToClipboard(url: string) {
		try {
			const resp = await fetch(url);
			if (!resp.ok) throw new Error("Failed to download image");
			const blob = await resp.blob();
			const ClipboardItemCtor = (window as any).ClipboardItem as
				| (new (items: Record<string, Blob>) => any)
				| undefined;
			if (!ClipboardItemCtor || !navigator.clipboard?.write) {
				throw new Error("Clipboard image write is not supported");
			}
			await navigator.clipboard.write([
				new ClipboardItemCtor({
					[blob.type || "image/png"]: blob,
				}),
			]);
			copyStatus = "تم نسخ الصورة";
			setTimeout(() => {
				copyStatus = null;
			}, 1500);
		} catch (err: any) {
			copyStatus = "تعذر نسخ الصورة";
			setTimeout(() => {
				copyStatus = null;
			}, 2000);
		}
	}

	async function onPromptPaste(e: ClipboardEvent) {
		if (!e.clipboardData) return;
		const pastedFiles = Array.from(e.clipboardData.files);
		const pastedImage = pastedFiles.find((f) => f.type.startsWith("image/"));
		if (!pastedImage) return;
		e.preventDefault();
		await setReferenceFromFile(pastedImage);
	}

	function openPromptEnhancer() {
		originalPromptBeforeImprove = prompt;
		isPromptEnhancerOpen = true;
		improvedPromptFull = "";
		improvedPromptTyping = "";
		improvePromptError = null;
		void improvePrompt();
	}

	function closePromptEnhancer() {
		isPromptEnhancerOpen = false;
		isImprovingPrompt = false;
		improvePromptError = null;
		improvedPromptFull = "";
		improvedPromptTyping = "";
		if (typingTimer) {
			clearInterval(typingTimer);
			typingTimer = null;
		}
	}

	async function improvePrompt() {
		if (isImprovingPrompt) return;
		isImprovingPrompt = true;
		improvePromptError = null;
		improvedPromptFull = "";
		improvedPromptTyping = "";

		if (typingTimer) {
			clearInterval(typingTimer);
			typingTimer = null;
		}

		try {
			const res = await fetch("/api/deepseek/prompt", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ input: prompt }),
			});
			if (!res.ok) {
				const t = await res.text().catch(() => "");
				throw new Error(t || `HTTP ${res.status}`);
			}
			const data = (await res.json()) as { prompt?: string };
			const out = String(data?.prompt ?? "").trim();
			if (!out) throw new Error("Empty prompt");
			improvedPromptFull = out;

			let i = 0;
			typingTimer = setInterval(() => {
				i += 1;
				improvedPromptTyping = improvedPromptFull.slice(0, i);
				if (i >= improvedPromptFull.length) {
					if (typingTimer) {
						clearInterval(typingTimer);
						typingTimer = null;
					}
				}
			}, 12);
		} catch (err: any) {
			improvePromptError = String(err?.message ?? err);
		} finally {
			isImprovingPrompt = false;
		}
	}

	function useImprovedPrompt() {
		if (!improvedPromptFull) return;
		prompt = improvedPromptFull;
		closePromptEnhancer();
	}

	function onDocumentKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") {
			isModelMenuOpen = false;
			isPromptHistoryOpen = false;
		}
	}

	async function loadGoogleModels() {
		if (isLoadingModels) return;
		isLoadingModels = true;
		modelsError = null;
		try {
			const res = await client.images.google.models.get();
			const data = handleResponse(res) as { models: GoogleModel[] };
			models = (data.models || [])
				.filter((m) => typeof m.id === "string" && m.id.includes("image"))
				.sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
			if (!selectedModel && models.length > 0) {
				selectedModel = models[0].id;
			}
		} catch (err: any) {
			modelsError = String(err);
		} finally {
			isLoadingModels = false;
		}
	}

	async function loadRecentGoogleImages() {
		if (isLoadingRecent) return;
		isLoadingRecent = true;
		recentError = null;
		try {
			const res = await client.images.get({
				query: {
					limit: "100",
				},
			});
			const data = handleResponse(res) as { images?: any[] };
			const imgs = (data.images || []).map((img) => ({
				...img,
				_id: img._id.toString(),
				createdAt: img.createdAt,
			})) as GeneratedImage[];

			recentImages = imgs.filter(isGoogleImage);
		} catch (err: any) {
			recentError = String(err);
		} finally {
			isLoadingRecent = false;
		}
	}

	async function generate() {
		if (!prompt.trim() || isGenerating) return;
		if (!selectedModel) {
			generateError = "Please select a model";
			return;
		}
		addPromptToHistory(prompt.trim());

		isGenerating = true;
		generateError = null;
		generatedImageUrl = null;

		try {
			const res = await client.images.google.generate.post({
				prompt: prompt.trim(),
				model: selectedModel,
				referenceImage: referenceImage ?? undefined,
			});
			const data = handleResponse(res) as {
				success: boolean;
				image?: { url: string };
				error?: string;
			};

			if (!data.success || !data.image?.url) {
				throw new Error(data.error || "Google image generation failed");
			}

			generatedImageUrl = data.image.url;
			lastGenerated = {
				_id: `local-${Date.now()}`,
				prompt: prompt.trim(),
				url: data.image.url,
				modelUsed: normalizeModelId(selectedModel),
				createdAt: new Date(),
			};
			recentImages = [lastGenerated, ...recentImages].slice(0, 100);
			lightboxImage = lastGenerated;
			await loadRecentGoogleImages();
		} catch (err: any) {
			generateError = String(err);
		} finally {
			isGenerating = false;
		}
	}

	function openReferenceFilePicker() {
		referenceFileInput?.click();
	}

	async function onReferenceFileChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement | null;
		const file = input?.files?.[0];
		if (!file) return;
		await setReferenceFromFile(file);
	}

	function clearReferenceImage() {
		if (referencePreviewUrl) {
			URL.revokeObjectURL(referencePreviewUrl);
		}
		referencePreviewUrl = null;
		referenceImage = null;
	}

	function closeLightbox() {
		lightboxImage = null;
	}

	async function copyImageLink(url: string) {
		try {
			await navigator.clipboard.writeText(url);
			copyStatus = "تم نسخ الرابط";
			setTimeout(() => {
				copyStatus = null;
			}, 1500);
		} catch (err: any) {
			copyStatus = "فشل نسخ الرابط";
			setTimeout(() => {
				copyStatus = null;
			}, 2000);
		}
	}

	async function deleteImage(img: GeneratedImage) {
		if (!img?._id || img._id.startsWith("local-") || img.modelUsed === "starter") return;
		if (!confirm("Are you sure you want to delete this image?")) return;

		deletingId = img._id;
		recentError = null;
		try {
			await client.images({ imageId: img._id }).delete().then(handleResponse);
			recentImages = recentImages.filter((x) => x._id !== img._id);
			if (lastGenerated?._id === img._id) {
				lastGenerated = null;
				generatedImageUrl = null;
			}
			if (lightboxImage?._id === img._id) {
				closeLightbox();
			}
		} catch (err: any) {
			recentError = String(err);
		} finally {
			deletingId = null;
		}
	}

	function onLightboxKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") {
			closeLightbox();
		}
	}

	onMount(() => {
		if (typeof document === "undefined") return;
		document.addEventListener("pointerdown", onDocumentPointerDown);
		document.addEventListener("keydown", onDocumentKeydown);
		loadPromptHistory();
		void Promise.all([loadGoogleModels(), loadRecentGoogleImages()]);

		return () => {
			document.removeEventListener("pointerdown", onDocumentPointerDown);
			document.removeEventListener("keydown", onDocumentKeydown);
			if (typingTimer) {
				clearInterval(typingTimer);
				typingTimer = null;
			}
		};
	});
</script>

<div
	class="google-images-page flex h-screen max-h-screen flex-col overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-black"
>
	<!-- Header -->
	<div class="relative flex-shrink-0 border-b border-white/10 bg-gray-900/50">
		<div class="px-6 py-6">
			<div class="mx-auto max-w-7xl">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<IconGoogleVideo classNames="h-8 w-8 text-blue-400" />
						<h1 class="text-2xl font-bold text-white">Gemini Image Studio</h1>
					</div>
					<button
						type="button"
						class="rounded-xl border-2 border-gray-700 bg-gray-800/50 px-4 py-2 text-sm font-medium text-white backdrop-blur-xl transition-all hover:border-blue-500 hover:bg-gray-700/50"
						onclick={loadRecentGoogleImages}
						disabled={isLoadingRecent}
					>
						{#if isLoadingRecent}
							<IconLoading />
						{:else}
							Refresh
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Main Content -->
	<div class="flex-1 overflow-y-auto px-6 py-8">
		<div class="mx-auto max-w-7xl space-y-8">
			<!-- Gallery -->
			<div class="space-y-6">
				{#if isLoadingRecent}
					<div class="flex h-64 items-center justify-center">
						<div class="space-y-3 text-center">
							<IconLoading />
							<p class="text-gray-400">Loading images...</p>
						</div>
					</div>
				{:else if recentError}
					<div class="rounded-xl border border-red-500/30 bg-red-900/20 p-6">
						<p class="text-red-400">{recentError}</p>
					</div>
				{:else}
					<!-- Starter Gallery -->
					{#if starterImages.length > 0}
						<div>
							<h2 class="mb-4 text-xl font-bold text-white">✨ Starter Inspiration</h2>
							<div class="overflow-x-auto pb-4">
								<div class="flex gap-6" style="width: max-content;">
									{#each starterImages as img (img.url)}
										<button
											type="button"
											class="group relative h-80 w-80 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-white/10 transition-all hover:scale-105 hover:border-purple-500 hover:shadow-2xl hover:shadow-purple-500/30 cursor-pointer"
											onclick={() =>
												(lightboxImage = {
													_id: img.url,
													url: img.url,
													prompt: img.prompt,
													modelUsed: "starter",
													createdAt: new Date(),
												})}
										>
											<img
												src={img.url}
												alt={img.prompt}
												class="h-full w-full object-cover transition-transform group-hover:scale-110"
												loading="lazy"
											/>
											<div
												class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100"
											></div>
										</button>
									{/each}
								</div>
							</div>
						</div>
					{/if}

					<!-- Generated Images -->
					{#if recentImages.length > 0}
						<div>
							<h2 class="mb-4 text-xl font-bold text-white">🎨 Your Creations</h2>
							<div class="overflow-x-auto pb-4">
								<div class="flex gap-6" style="width: max-content;">
									{#each recentImages as img (img._id)}
										<div
											class="group relative h-80 w-80 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-white/10 transition-all hover:scale-105 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/30"
										>
											<button
												type="button"
												class="h-full w-full cursor-pointer"
												onclick={() => (lightboxImage = img)}
											>
												<img
													src={img.url}
													alt={img.prompt}
													class="h-full w-full object-cover transition-transform group-hover:scale-110"
													loading="lazy"
												/>
											</button>
											<div
												class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
											>
												<div class="absolute bottom-0 left-0 right-0 p-4">
													<p class="line-clamp-3 text-sm font-medium text-white">{img.prompt}</p>
												</div>
											</div>
											<div
												class="absolute right-3 top-3 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100"
											>
												<button
													type="button"
													class="rounded-lg bg-white/90 p-2.5 text-gray-900 shadow-lg backdrop-blur-sm hover:bg-white"
													onclick={(e) => {
														e.stopPropagation();
														copyImageToClipboard(img.url);
													}}
												>
													<CarbonCopy class="text-lg" />
												</button>
												<button
													type="button"
													class="rounded-lg bg-red-500/90 p-2.5 text-white shadow-lg backdrop-blur-sm hover:bg-red-600 disabled:opacity-50"
													onclick={(e) => {
														e.stopPropagation();
														deleteImage(img);
													}}
													disabled={deletingId === img._id}
												>
													{#if deletingId === img._id}
														<IconLoading />
													{:else}
														<CarbonTrash class="text-lg" />
													{/if}
												</button>
											</div>
										</div>
									{/each}
								</div>
							</div>
						</div>
					{:else}
						<div class="flex h-64 items-center justify-center">
							<div class="space-y-3 text-center">
								<div class="text-6xl">🎨</div>
								<p class="font-medium text-gray-400">
									No images yet. Create your first masterpiece!
								</p>
							</div>
						</div>
					{/if}
				{/if}
			</div>

			<!-- Generation Controls -->
			<div
				class="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900/80 via-gray-900/60 to-gray-900/80 p-6 shadow-2xl backdrop-blur-2xl"
			>
				<div class="space-y-4">
					<!-- Model Selection -->
					<div class="flex gap-3">
						<div class="relative flex-1" bind:this={modelMenuRoot}>
							<button
								type="button"
								class="flex w-full items-center justify-between gap-3 rounded-xl border-2 border-gray-700 bg-gray-800/50 px-4 py-3.5 text-left text-sm text-white shadow-lg transition-all hover:border-blue-500 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
								onclick={toggleModelMenu}
								disabled={isGenerating || isLoadingModels}
							>
								<span class="flex items-center gap-2 truncate">
									{#if isBananaModel(selectedModel)}
										<img src="/google_studio_page/banana_icon.svg" alt="banana" class="h-4 w-4" />
									{/if}
									{#if isLoadingModels}
										Loading models...
									{:else if selectedModel}
										{getModelDisplayName(selectedModel)}
									{:else}
										Select model
									{/if}
								</span>
								<div class="flex items-center gap-2">
									{#if selectedModel && modelHas4k(selectedModel)}
										<span
											class="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-400"
											>4K</span
										>
									{/if}
									{#if selectedModel && modelHasVision(selectedModel)}
										<span
											class="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-bold text-indigo-400"
											>Vision</span
										>
									{/if}
								</div>
							</button>

							{#if isModelMenuOpen}
								<div
									class="absolute bottom-full left-0 right-0 z-50 mb-2 max-h-72 overflow-auto rounded-xl border border-gray-700 bg-gray-900/95 shadow-2xl backdrop-blur-xl"
								>
									{#each models as m (m.id)}
										<button
											type="button"
											class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-gray-800/50"
											onclick={() => selectModel(m.id)}
										>
											{#if isBananaModel(m.id)}
												<img
													src="/google_studio_page/banana_icon.svg"
													alt="banana"
													class="h-4 w-4 flex-none"
												/>
											{/if}
											<span class="flex-1">
												<span class="block font-medium text-white">{getModelDisplayName(m.id)}</span
												>
												<span class="block truncate text-xs text-gray-500"
													>{normalizeModelId(m.id)}</span
												>
											</span>
											<div class="flex gap-1.5">
												{#if modelHas4k(m.id)}
													<span
														class="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400"
														>4K</span
													>
												{/if}
												{#if modelHasVision(m.id)}
													<span
														class="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-bold text-indigo-400"
														>Vision</span
													>
												{/if}
											</div>
										</button>
									{/each}
								</div>
							{/if}
						</div>

						{#if referencePreviewUrl}
							<div
								class="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border-2 border-blue-500"
							>
								<img src={referencePreviewUrl} alt="Reference" class="h-full w-full object-cover" />
								<button
									type="button"
									class="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow-lg hover:bg-red-600"
									onclick={clearReferenceImage}
								>
									<CarbonClose class="text-sm" />
								</button>
							</div>
						{:else}
							<button
								type="button"
								class="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-gray-700 text-gray-400 transition-all hover:border-blue-500 hover:text-blue-400"
								onclick={openReferenceFilePicker}
								disabled={isGenerating}
							>
								<CarbonUpload class="text-xl" />
							</button>
						{/if}
						<input
							type="file"
							accept="image/*"
							class="hidden"
							bind:this={referenceFileInput}
							onchange={onReferenceFileChange}
							disabled={isGenerating}
						/>
					</div>

					<!-- Prompt Input -->
					<div class="relative" bind:this={promptHistoryRoot}>
						<textarea
							bind:value={prompt}
							rows="3"
							disabled={isGenerating}
							placeholder="Describe your image in vivid detail..."
							class="w-full resize-none rounded-xl border-2 border-gray-700 bg-gray-800/50 px-4 py-3 pr-12 text-white shadow-lg backdrop-blur-xl transition-all placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
							onpaste={onPromptPaste}
							onkeydown={(e) => {
								if (e.key !== "Enter") return;
								if (e.shiftKey) return;
								e.preventDefault();
								generate();
							}}
						></textarea>
						<button
							type="button"
							class="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-lg border border-gray-600 bg-gray-700/50 text-gray-300 shadow-sm hover:bg-gray-600/50 disabled:cursor-not-allowed disabled:opacity-50"
							onclick={togglePromptHistory}
							disabled={isGenerating}
							aria-label="Prompt History"
							title="Last 5 prompts"
						>
							<CarbonChevronRight
								class={"text-lg transition-transform " +
									(isPromptHistoryOpen ? "-rotate-90" : "rotate-90")}
							/>
						</button>
						{#if isPromptHistoryOpen}
							<div
								class="absolute bottom-full right-0 z-50 mb-2 max-h-56 w-full overflow-auto rounded-xl border border-gray-700 bg-gray-900/95 shadow-2xl backdrop-blur-xl"
								role="listbox"
							>
								{#if promptHistory.length === 0}
									<div class="px-3 py-2 text-sm text-gray-400">No saved prompts yet</div>
								{:else}
									{#each promptHistory as p (p)}
										<button
											type="button"
											class="w-full px-3 py-2 text-left text-sm text-white hover:bg-gray-800/50"
											onclick={() => selectPromptFromHistory(p)}
										>
											<span class="block truncate">{p}</span>
										</button>
									{/each}
								{/if}
							</div>
						{/if}
					</div>

					<div class="flex gap-2">
						<button
							type="button"
							class="flex-1 rounded-xl bg-blue-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
							onclick={generate}
							disabled={isGenerating}
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
						<button
							type="button"
							class="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-purple-500/50 bg-purple-500/10 text-purple-400 transition-all hover:border-purple-400 hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-50"
							onclick={openPromptEnhancer}
							disabled={isGenerating}
							title="Enhance Prompt with AI"
						>
							<IconPrompt classNames="h-5 w-5" />
						</button>
						{#if $page.data.isAdmin}
							<button
								type="button"
								class="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-gray-600/60 bg-gray-800/40 text-gray-200 transition-all hover:bg-gray-700/50 disabled:cursor-not-allowed disabled:opacity-50"
								onclick={() => (isGoogleKeyOpen = true)}
								disabled={isGenerating}
								title="Set Google Studio API key"
							>
								<IconKey classNames="h-5 w-5" />
							</button>
						{/if}
					</div>

					{#if generateError}
						<div
							class="rounded-lg border border-red-500/30 bg-red-900/30 px-4 py-2 text-sm text-red-400"
						>
							{generateError}
						</div>
					{/if}
					{#if copyStatus}
						<div
							class="rounded-lg border border-green-500/30 bg-green-900/30 px-4 py-2 text-sm text-green-400"
						>
							{copyStatus}
						</div>
					{/if}
				</div>
			</div>

			{#if isGoogleKeyOpen}
				<div
					class="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
					onclick={() => (isGoogleKeyOpen = false)}
				>
					<div
						class="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-gray-900 shadow-2xl"
						onclick={(e) => e.stopPropagation()}
					>
						<div class="flex items-center justify-between border-b border-white/10 px-4 py-3">
							<div class="flex items-center gap-2">
								<IconKey classNames="h-5 w-5 text-blue-400" />
								<p class="text-sm font-semibold text-white">Google Studio API Key</p>
							</div>
							<button
								type="button"
								class="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
								onclick={() => (isGoogleKeyOpen = false)}
							>
								<CarbonClose class="text-xl" />
							</button>
						</div>
						<div class="space-y-3 p-4">
							<a
								href="https://aistudio.google.com/app/apikey"
								target="_blank"
								rel="noreferrer"
								class="inline-flex text-sm text-blue-400 underline decoration-blue-400/40 underline-offset-2 hover:decoration-blue-400"
							>
								Open Google AI Studio
							</a>
							<div class="flex items-center gap-2">
								<input
									bind:value={googleKeyInput}
									type={showGoogleKey ? "text" : "password"}
									placeholder="AIza..."
									class="w-full rounded-xl border border-white/10 bg-gray-800/50 px-4 py-3 text-sm text-white placeholder:text-gray-500"
									disabled={savingGoogleKey}
								/>
								<button
									type="button"
									class="rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-200 hover:bg-gray-800"
									onclick={() => (showGoogleKey = !showGoogleKey)}
									disabled={savingGoogleKey}
								>
									{showGoogleKey ? "Hide" : "Show"}
								</button>
							</div>
							{#if googleKeyError}
								<p class="text-sm text-red-400">{googleKeyError}</p>
							{/if}
							{#if googleKeySaved}
								<p class="text-sm text-green-400">Saved</p>
							{/if}
							<div class="flex items-center justify-end gap-2">
								<button
									type="button"
									class="rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-200 hover:bg-gray-800 disabled:opacity-50"
									onclick={() => (isGoogleKeyOpen = false)}
									disabled={savingGoogleKey}
								>
									Cancel
								</button>
								<button
									type="button"
									class="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
									onclick={saveGoogleKey}
									disabled={savingGoogleKey}
								>
									Save
								</button>
							</div>
						</div>
					</div>
				</div>
			{/if}
			<!-- Lightbox -->
			{#if lightboxImage}
				<div
					class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl"
					onclick={closeLightbox}
					onkeydown={onLightboxKeydown}
					role="dialog"
					aria-modal="true"
					tabindex="-1"
				>
					<div
						class="relative w-full max-w-6xl overflow-hidden rounded-2xl bg-gray-900 shadow-2xl"
						onclick={(e) => e.stopPropagation()}
					>
						<div
							class="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-4"
						>
							<p class="truncate pr-4 text-sm font-medium text-white">
								{lightboxImage.prompt}
							</p>
							<div class="flex items-center gap-2">
								<button
									type="button"
									class="inline-flex items-center gap-2 rounded-lg border-2 border-gray-700 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
									onclick={() => lightboxImage && copyImageLink(lightboxImage.url)}
								>
									<CarbonCopy class="text-lg" />
									Copy Link
								</button>
								<button
									type="button"
									class="inline-flex items-center gap-2 rounded-lg border-2 border-gray-700 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
									onclick={() => lightboxImage && copyImageToClipboard(lightboxImage.url)}
								>
									<CarbonCopy class="text-lg" />
									Copy Image
								</button>
								<a
									href={lightboxImage.url}
									download="gemini-image.png"
									class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
								>
									<CarbonDownload class="text-lg" />
									Download
								</a>

								{#if lightboxImage.modelUsed !== "starter"}
									<button
										type="button"
										class="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
										onclick={() => lightboxImage && deleteImage(lightboxImage)}
										disabled={deletingId === lightboxImage?._id}
									>
										{#if deletingId === lightboxImage?._id}
											<IconLoading />
										{:else}
											<CarbonTrash class="text-lg" />
										{/if}
										Delete
									</button>
								{/if}
								<button
									type="button"
									class="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
									onclick={closeLightbox}
								>
									<CarbonClose class="text-xl" />
								</button>
							</div>
						</div>
						<div class="bg-black">
							<img
								src={lightboxImage.url}
								alt={lightboxImage.prompt}
								class="max-h-[80vh] w-full object-contain"
							/>
						</div>
					</div>
				</div>
			{/if}
			<!-- Prompt Enhancer Modal -->
			{#if isPromptEnhancerOpen}
				<div
					class="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
				>
					<div
						class="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-gray-900 shadow-2xl"
					>
						<div
							class="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-purple-900/50 to-gray-900 px-4 py-3"
						>
							<div class="flex items-center gap-2">
								<IconPrompt classNames="h-5 w-5 text-purple-400" />
								<p class="text-sm font-semibold text-white">Enhance Prompt with AI</p>
							</div>
							<button
								type="button"
								class="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
								onclick={closePromptEnhancer}
							>
								<CarbonClose class="text-xl" />
							</button>
						</div>
						<div class="space-y-3 p-4">
							<div>
								<p class="mb-1 text-xs font-medium text-gray-400">Original Prompt</p>
								<div
									class="rounded-lg border border-white/10 bg-gray-800/50 p-3 text-sm text-white"
								>
									{originalPromptBeforeImprove}
								</div>
							</div>
							<div>
								<p class="mb-1 text-xs font-medium text-gray-400">Enhanced Prompt</p>
								<div
									class="min-h-[120px] rounded-lg border border-white/10 bg-gray-800/50 p-3 text-sm text-white"
								>
									{#if improvePromptError}
										<p class="text-sm text-red-400">{improvePromptError}</p>
									{:else if isImprovingPrompt && !improvedPromptTyping}
										<div class="flex items-center gap-2 text-gray-400">
											<IconLoading />
											<span>Enhancing...</span>
										</div>
									{:else}
										{improvedPromptTyping}
									{/if}
								</div>
							</div>
							<div class="flex flex-wrap items-center justify-end gap-2 pt-1">
								<button
									type="button"
									class="rounded-lg border border-gray-600 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
									onclick={closePromptEnhancer}
									disabled={isImprovingPrompt}
								>
									Cancel
								</button>
								<button
									type="button"
									class="rounded-lg border border-gray-600 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
									onclick={improvePrompt}
									disabled={isImprovingPrompt}
								>
									Regenerate
								</button>
								<button
									type="button"
									class="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-2 text-sm font-medium text-white hover:from-blue-700 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
									onclick={useImprovedPrompt}
									disabled={!improvedPromptFull || isImprovingPrompt}
								>
									Use This
								</button>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	@media (min-width: 768px) {
		:global([data-nav-collapsed="true"]) .google-images-page {
			padding-left: 3.5rem;
		}
	}
</style>
