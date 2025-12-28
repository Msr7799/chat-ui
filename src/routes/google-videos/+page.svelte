<script lang="ts">
	import { onMount } from "svelte";
	import { base } from "$app/paths";
	import { page } from "$app/stores";
	import { useAPIClient, handleResponse } from "$lib/APIClient";
	import IconLoading from "$lib/components/icons/IconLoading.svelte";
	import IconGoogle from "$lib/components/icons/IconGoogle.svelte";
	import IconPrompt from "$lib/components/icons/IconPrompt.svelte";
	import IconKey from "$lib/components/icons/IconKey.svelte";
	import CarbonPlay from "~icons/carbon/play";
	import CarbonDownload from "~icons/carbon/download";
	import CarbonUpload from "~icons/carbon/upload";
	import CarbonCopy from "~icons/carbon/copy";
	import CarbonCheckmark from "~icons/carbon/checkmark";
	import CarbonClose from "~icons/carbon/close";
	import CarbonChevronRight from "~icons/carbon/chevron-right";

	type GeneratedVideo = {
		_id: string;
		prompt: string;
		url: string;
		modelUsed: string;
		mode: "text-to-video" | "image-to-video";
		createdAt: Date;
		width?: number;
		height?: number;
		duration?: number;
	};

	const client = useAPIClient();

	const models = [
		{ id: "veo-3.1-generate-preview", label: "Veo 3.1 Preview" },
		{ id: "veo-3.1-fast-generate-preview", label: "Veo 3.1 Preview Fast" },
	] as const;

	const aspectRatios = [
		{ id: "16:9", label: "16:9 (Landscape)" },
		{ id: "9:16", label: "9:16 (Portrait)" },
	] as const;

	const resolutions = [
		{ id: "720", label: "720p HD" },
		{ id: "1080", label: "1080p Full HD" },
	] as const;

	let mode = $state<"text-to-video" | "image-to-video">("text-to-video");
	let selectedModel = $state<(typeof models)[number]["id"]>(models[0].id);
	let selectedAspectRatio = $state<(typeof aspectRatios)[number]["id"]>("16:9");
	let selectedResolution = $state<(typeof resolutions)[number]["id"]>("1080");
	let prompt = $state("");

	let isGenerating = $state(false);
	let generateError = $state<string | null>(null);

	let referenceImage = $state<{ data: string; mimeType: string } | null>(null);
	let referencePreviewUrl = $state<string | null>(null);
	let referenceFileInput = $state<HTMLInputElement | null>(null);

	let recentVideos = $state<GeneratedVideo[]>([]);
	let isLoadingRecent = $state(false);
	let recentError = $state<string | null>(null);
	let lastGenerated = $state<GeneratedVideo | null>(null);

	let copyStatus = $state<string | null>(null);
	let selectedVideoForPreview = $state<GeneratedVideo | null>(null);

	// Prompt Enhancement
	let isPromptEnhancerOpen = $state(false);
	let isImprovingPrompt = $state(false);
	let improvePromptError = $state<string | null>(null);
	let improvedPromptFull = $state<string>("");
	let improvedPromptTyping = $state<string>("");
	let originalPromptBeforeImprove = $state<string>("");
	let typingTimer: ReturnType<typeof setInterval> | null = null;

	// Prompt History
	let isPromptHistoryOpen = $state(false);
	let promptHistoryRoot = $state<HTMLDivElement | null>(null);
	let promptHistory = $state<string[]>([]);
	const PROMPT_HISTORY_KEY = "google_videos_prompt_history";

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

	function clearReferenceImage() {
		if (referencePreviewUrl) URL.revokeObjectURL(referencePreviewUrl);
		referencePreviewUrl = null;
		referenceImage = null;
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

	async function copyVideoLink(url: string) {
		try {
			await navigator.clipboard.writeText(url);
			copyStatus = "تم نسخ الرابط";
			setTimeout(() => {
				copyStatus = null;
			}, 1500);
		} catch {
			copyStatus = "فشل نسخ الرابط";
			setTimeout(() => {
				copyStatus = null;
			}, 2000);
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
	}

	function selectPromptFromHistory(p: string) {
		prompt = p;
		isPromptHistoryOpen = false;
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

	function onDocumentPointerDown(e: Event) {
		const target = e.target as Node | null;
		if (isPromptHistoryOpen && promptHistoryRoot && target && !promptHistoryRoot.contains(target)) {
			isPromptHistoryOpen = false;
		}
	}

	async function loadRecentVideos() {
		if (isLoadingRecent) return;
		isLoadingRecent = true;
		recentError = null;
		try {
			const res = await client.videos.get({
				query: {
					limit: "50",
				},
			});
			const data = handleResponse(res) as { videos?: any[] };
			recentVideos = (data.videos || []).map((v) => ({
				...v,
				_id: v._id.toString(),
				createdAt: v.createdAt,
			})) as GeneratedVideo[];
		} catch (err: any) {
			recentError = String(err);
		} finally {
			isLoadingRecent = false;
		}
	}

	async function generate() {
		if (isGenerating) return;
		if (!prompt.trim()) return;

		if (mode === "image-to-video" && !referenceImage) {
			generateError = "يرجى إرفاق صورة للـ Image to Video";
			return;
		}

		addPromptToHistory(prompt.trim());
		isGenerating = true;
		generateError = null;

		try {
			const res = await client.videos.google.generate.post({
				prompt: prompt.trim(),
				model: selectedModel,
				mode,
				aspectRatio: selectedAspectRatio,
				resolution: selectedResolution,
				referenceImage: mode === "image-to-video" ? (referenceImage ?? undefined) : undefined,
			});
			const data = handleResponse(res) as {
				success: boolean;
				video?: { url: string };
				error?: string;
			};

			if (!data.success || !data.video?.url) {
				throw new Error(data.error || "Google video generation failed");
			}

			lastGenerated = {
				_id: `local-${Date.now()}`,
				prompt: prompt.trim(),
				url: data.video.url,
				modelUsed: selectedModel,
				mode,
				createdAt: new Date(),
			};

			recentVideos = [lastGenerated, ...recentVideos].slice(0, 50);
			selectedVideoForPreview = lastGenerated;
			await loadRecentVideos();
		} catch (err: any) {
			generateError = String(err?.message ?? err);
		} finally {
			isGenerating = false;
		}
	}

	onMount(() => {
		if (typeof document !== "undefined") {
			document.addEventListener("pointerdown", onDocumentPointerDown);
			loadPromptHistory();
		}
		void loadRecentVideos();

		return () => {
			if (typeof document !== "undefined") {
				document.removeEventListener("pointerdown", onDocumentPointerDown);
			}
			if (typingTimer) {
				clearInterval(typingTimer);
				typingTimer = null;
			}
		};
	});
</script>

<div class="google-videos-page flex h-screen max-h-screen flex-col overflow-hidden">
	<!-- Hero Section with Background Video -->
	<div class="hero-section relative flex-shrink-0">
		<video
			autoplay
			loop
			muted
			playsinline
			class="absolute inset-0 h-full w-full object-cover"
			src="/google_studio_page/1.mp4"
		>
			<track kind="captions" label="No captions available" />
		</video>
		<div class="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70"></div>

		<div class="relative z-10 px-6 py-12">
			<div class="mx-auto max-w-7xl">
				<div class="mb-6 flex items-center gap-4">
					<div
						class="rounded-xl border border-white/20 bg-white/10 p-3 shadow-2xl backdrop-blur-xl"
					>
						<IconGoogle classNames="text-3xl text-white" />
					</div>
					<div>
						<h1 class="mb-2 text-4xl font-bold text-white drop-shadow-2xl">Veo Studio</h1>
						<p class="text-lg text-white/90 drop-shadow-lg">
							Create stunning AI-powered videos with Veo 3.1
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Main Content -->
	<div class="flex-1 overflow-y-auto bg-gradient-to-b from-gray-900 via-gray-900 to-black">
		<div class="mx-auto max-w-7xl px-6 py-8">
			<!-- Generation Panel -->
			<div
				class="mb-8 rounded-2xl border border-gray-800/60 bg-gray-900/80 p-6 shadow-2xl backdrop-blur-xl"
			>
				<h2 class="mb-6 flex items-center gap-2 text-xl font-bold text-white">
					<CarbonPlay class="text-blue-400" />
					Generate New Video
				</h2>

				<div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div class="space-y-2">
						<label for="mode-select" class="text-sm font-medium text-gray-300">Mode</label>
						<select
							id="mode-select"
							class="w-full rounded-xl border-2 border-gray-700 bg-gray-800 px-4 py-3 text-sm font-medium text-white shadow-lg transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
							bind:value={mode}
							disabled={isGenerating}
						>
							<option value="text-to-video">📝 Text to Video</option>
							<option value="image-to-video">🖼️ Image to Video</option>
						</select>
					</div>

					<div class="space-y-2">
						<label for="model-select" class="text-sm font-medium text-gray-300">Model</label>
						<select
							id="model-select"
							class="w-full rounded-xl border-2 border-gray-700 bg-gray-800 px-4 py-3 text-sm font-medium text-white shadow-lg transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
							bind:value={selectedModel}
							disabled={isGenerating}
						>
							{#each models as m (m.id)}
								<option value={m.id}>{m.label}</option>
							{/each}
						</select>
					</div>

					<div class="space-y-2">
						<label for="aspect-ratio-select" class="text-sm font-medium text-gray-300"
							>Aspect Ratio</label
						>
						<select
							id="aspect-ratio-select"
							class="w-full rounded-xl border-2 border-gray-700 bg-gray-800 px-4 py-3 text-sm font-medium text-white shadow-lg transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
							bind:value={selectedAspectRatio}
							disabled={isGenerating}
						>
							{#each aspectRatios as ar (ar.id)}
								<option value={ar.id}>{ar.label}</option>
							{/each}
						</select>
					</div>

					<div class="space-y-2">
						<label for="resolution-select" class="text-sm font-medium text-gray-300"
							>Resolution</label
						>
						<select
							id="resolution-select"
							class="w-full rounded-xl border-2 border-gray-700 bg-gray-800 px-4 py-3 text-sm font-medium text-white shadow-lg transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
							bind:value={selectedResolution}
							disabled={isGenerating}
						>
							{#each resolutions as res (res.id)}
								<option value={res.id}>{res.label}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="mb-6 flex gap-4">
					{#if mode === "image-to-video"}
						<div class="flex-shrink-0">
							<div
								class="relative h-24 w-24 overflow-hidden rounded-xl border-2 border-dashed border-gray-600 bg-gray-800 transition-all hover:border-blue-400"
							>
								{#if referencePreviewUrl}
									<img
										src={referencePreviewUrl}
										alt="Reference"
										class="h-full w-full object-cover"
									/>
									<button
										type="button"
										class="absolute right-2 top-2 rounded-lg bg-red-500 px-2 py-1 text-xs font-bold text-white shadow-lg transition-all hover:scale-110 hover:bg-red-600"
										onclick={clearReferenceImage}
									>
										×
									</button>
								{:else}
									<button
										type="button"
										class="flex h-full w-full flex-col items-center justify-center gap-1 text-gray-400 transition-colors hover:text-blue-400"
										onclick={openReferenceFilePicker}
										disabled={isGenerating}
									>
										<CarbonUpload class="text-2xl" />
										<span class="text-xs font-medium">Upload</span>
									</button>
								{/if}
							</div>
							<input
								type="file"
								accept="image/*"
								class="hidden"
								bind:this={referenceFileInput}
								onchange={onReferenceFileChange}
								disabled={isGenerating}
							/>
						</div>
					{/if}

					<div class="min-w-0 flex-1 space-y-3">
						<div class="flex items-center gap-2">
							<div class="relative min-w-0 flex-1" bind:this={promptHistoryRoot}>
								<textarea
									bind:value={prompt}
									rows="3"
									disabled={isGenerating}
									placeholder="Describe your video in detail..."
									class="w-full resize-none rounded-xl border-2 border-gray-700 bg-gray-800 px-4 py-3 pr-12 text-white shadow-lg transition-all placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
									onkeydown={(e) => {
										if (e.key !== "Enter") return;
										if (e.shiftKey) return;
										e.preventDefault();
										generate();
									}}
								></textarea>
								<button
									type="button"
									class="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-md border border-gray-600 bg-gray-700 text-gray-300 shadow-sm hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
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
										class="absolute bottom-full right-0 z-50 mb-2 max-h-56 w-full overflow-auto rounded-lg border border-gray-700 bg-gray-800 shadow-xl"
										role="listbox"
									>
										{#if promptHistory.length === 0}
											<div class="px-3 py-2 text-sm text-gray-400">No saved prompts yet</div>
										{:else}
											{#each promptHistory as p (p)}
												<button
													type="button"
													class="w-full px-3 py-2 text-left text-sm text-white hover:bg-gray-700"
													onclick={() => selectPromptFromHistory(p)}
												>
													<span class="block truncate">{p}</span>
												</button>
											{/each}
										{/if}
									</div>
								{/if}
							</div>
							<button
								type="button"
								class="flex h-12 w-12 flex-none items-center justify-center rounded-lg border-2 border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
								onclick={openPromptEnhancer}
								disabled={isGenerating}
								aria-label="Enhance Prompt"
								title="Enhance Prompt with AI"
							>
								<IconPrompt classNames="h-5 w-5" />
							</button>
							{#if $page.data.isAdmin}
								<button
									type="button"
									class="flex h-12 w-12 flex-none items-center justify-center rounded-lg border-2 border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
									onclick={() => (isGoogleKeyOpen = true)}
									disabled={isGenerating}
									aria-label="Set Google Studio API key"
									title="Set Google Studio API key"
								>
									<IconKey classNames="h-5 w-5" />
								</button>
							{/if}
						</div>

						{#if generateError}
							<div
								class="animate-shake rounded-lg border border-red-500/30 bg-red-900/30 px-4 py-2 text-sm text-red-400"
							>
								{generateError}
							</div>
						{/if}

						<button
							type="button"
							class="w-full rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
							onclick={generate}
							disabled={isGenerating}
						>
							{#if isGenerating}
								<span class="flex items-center justify-center gap-2">
									<IconLoading />
									Generating...
								</span>
							{:else}
								<span class="flex items-center justify-center gap-2">
									<CarbonPlay class="text-lg" />
									Generate Video
								</span>
							{/if}
						</button>
					</div>
				</div>
			</div>

			<!-- Video Preview Modal -->
			{#if selectedVideoForPreview}
				<div
					class="fixed inset-0 z-50 relative flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
					role="dialog"
					aria-modal="true"
					aria-labelledby="preview-title"
					tabindex="-1"
					onkeydown={(e) => {
						if (e.key === "Escape") selectedVideoForPreview = null;
					}}
				>
					<button
						type="button"
						class="absolute inset-0 cursor-default bg-transparent"
						aria-label="Close preview"
						tabindex="-1"
						onclick={() => (selectedVideoForPreview = null)}
					></button>
					<div
						class="relative z-10 w-full max-w-5xl overflow-hidden rounded-2xl bg-gray-900 shadow-2xl"
						role="document"
						onclick={(e) => e.stopPropagation()}
					>
						<div class="relative">
							<video
								src={selectedVideoForPreview.url}
								controls
								autoplay
								class="max-h-[70vh] w-full bg-black"
							>
								<track kind="captions" label="No captions available" />
							</video>
							<button
								type="button"
								class="absolute right-4 top-4 rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-black/80"
								onclick={() => (selectedVideoForPreview = null)}
								aria-label="Close preview"
							>
								<CarbonClose class="text-xl" />
							</button>
						</div>
						<div class="space-y-4 p-6">
							<div class="flex items-start justify-between gap-4">
								<div class="flex-1">
									<p id="preview-title" class="mb-1 text-sm font-medium text-gray-400">Prompt:</p>
									<p class="text-white">{selectedVideoForPreview.prompt}</p>
								</div>
								<div class="flex gap-2">
									<button
										type="button"
										class="inline-flex items-center gap-2 rounded-lg border-2 border-gray-700 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-gray-800"
										onclick={() =>
											selectedVideoForPreview && copyVideoLink(selectedVideoForPreview.url)}
									>
										<CarbonCopy class="text-lg" />
										Copy
									</button>
									<a
										href={selectedVideoForPreview.url}
										download="veo-video.mp4"
										class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-700"
									>
										<CarbonDownload class="text-lg" />
										Download
									</a>
								</div>
							</div>
							{#if copyStatus}
								<p class="flex items-center gap-1 text-sm text-green-400">
									<CarbonCheckmark />
									{copyStatus}
								</p>
							{/if}
						</div>
					</div>
				</div>
			{/if}

			
<!-- Videos Gallery -->
			<div class="space-y-6">
				<div class="flex items-center justify-between">
					<h2 class="flex items-center gap-2 text-2xl font-bold text-white">📚 Generated Videos</h2>
					<button
						type="button"
						class="rounded-lg border-2 border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-gray-700"
						onclick={loadRecentVideos}
						disabled={isLoadingRecent}
					>
						{#if isLoadingRecent}
							<IconLoading />
						{:else}
							Refresh
						{/if}
					</button>
				</div>

				{#if isLoadingRecent}
					<div class="flex h-64 items-center justify-center">
						<div class="space-y-3 text-center">
							<IconLoading />
							<p class="text-gray-400">Loading videos...</p>
						</div>
					</div>
				{:else if recentError}
					<div class="rounded-xl border border-red-500/30 bg-red-900/20 p-6">
						<p class="text-red-400">{recentError}</p>
					</div>
				{:else if recentVideos.length === 0}
					<div class="flex h-64 items-center justify-center">
						<div class="space-y-3 text-center">
							<div class="text-6xl">🎬</div>
							<p class="font-medium text-gray-400">No videos yet. Create your first one!</p>
						</div>
					</div>
				{:else}
					<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{#each recentVideos as v (v._id)}
							<button
								type="button"
								class="group relative overflow-hidden rounded-xl border-2 border-gray-700 bg-gray-800 transition-all hover:scale-[1.02] hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/20"
								onclick={() => (selectedVideoForPreview = v)}
								onkeydown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										selectedVideoForPreview = v;
									}
								}}
							>
								<div class="relative aspect-video w-full overflow-hidden bg-black">
									<video
										src={v.url}
										class="h-full w-full object-cover transition-opacity group-hover:opacity-80"
										muted
										preload="metadata"
									>
										<track kind="captions" label="No captions available" />
									</video>
									<div
										class="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100"
									>
										<div
											class="scale-90 transform rounded-full bg-blue-500 p-4 transition-transform group-hover:scale-100"
										>
											<CarbonPlay class="text-2xl text-white" />
										</div>
									</div>
									<div class="absolute left-3 top-3 flex gap-2">
										<span
											class="rounded-full bg-blue-500/90 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm"
										>
											{v.mode === "text-to-video" ? "Text" : "Image"}
										</span>
									</div>
								</div>
								<div class="p-4">
									<p class="line-clamp-2 text-left text-sm font-medium text-gray-300">
										{v.prompt}
									</p>
									<p class="mt-2 text-left text-xs text-gray-500">
										{new Date(v.createdAt).toLocaleDateString("en-US", {
											month: "short",
											day: "numeric",
											year: "numeric",
										})}
									</p>
								</div>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

{#if isGoogleKeyOpen}
	<div
		class="fixed inset-0 z-[10000] relative flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-labelledby="google-key-title"
		tabindex="-1"
		onkeydown={(e) => {
			if (e.key === "Escape") isGoogleKeyOpen = false;
		}}
	>
		<button
			type="button"
			class="absolute inset-0 cursor-default bg-transparent"
			aria-label="Close dialog"
			tabindex="-1"
			onclick={() => (isGoogleKeyOpen = false)}
		></button>
		<div
			class="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-gray-900 shadow-2xl"
			onclick={(e) => e.stopPropagation()}
			role="document"
		>
			<div class="flex items-center justify-between border-b border-white/10 px-4 py-3">
				<div class="flex items-center gap-2">
					<IconKey classNames="h-5 w-5 text-blue-400" />
					<p class="text-sm font-semibold text-white" id="google-key-title">Google Studio API Key</p>
				</div>
				<button
					type="button"
					class="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
					onclick={() => (isGoogleKeyOpen = false)}
					aria-label="Close"
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

<!-- Prompt Enhancer Modal -->
{#if isPromptEnhancerOpen}
	<div
		class="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-labelledby="enhancer-title"
		tabindex="-1"
		onkeydown={(e) => {
			if (e.key === "Escape") closePromptEnhancer();
		}}
	>
		<div
			class="w-full max-w-3xl overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-2xl"
			role="document"
		>
			<div class="flex items-center justify-between border-b border-gray-800 px-4 py-3">
				<div class="flex items-center gap-2">
					<IconPrompt classNames="h-5 w-5 text-blue-400" />
					<p id="enhancer-title" class="text-sm font-semibold text-white">Enhance Prompt with AI</p>
				</div>
				<button
					type="button"
					class="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-gray-200"
					onclick={closePromptEnhancer}
					aria-label="Close"
				>
					<CarbonClose class="text-xl" />
				</button>
			</div>
			<div class="space-y-3 p-4">
				<div>
					<p class="mb-1 text-xs font-medium text-gray-400">Original Prompt</p>
					<div class="rounded-lg border border-gray-700 bg-gray-800 p-3 text-sm text-white">
						{originalPromptBeforeImprove}
					</div>
				</div>
				<div>
					<p class="mb-1 text-xs font-medium text-gray-400">Enhanced Prompt (English)</p>
					<div
						class="min-h-[120px] rounded-lg border border-gray-700 bg-gray-800 p-3 text-sm text-white"
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
						class="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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

<style>
	.hero-section {
		height: 280px;
	}

	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		25% {
			transform: translateX(-5px);
		}
		75% {
			transform: translateX(5px);
		}
	}

	.animate-shake {
		animation: shake 0.3s ease-in-out;
	}

	@media (min-width: 768px) {
		:global([data-nav-collapsed="true"]) .google-videos-page {
			padding-left: 3.5rem;
		}
	}
</style>
