<script lang="ts">
	import "../styles/main.css";

	import { onDestroy, onMount, untrack } from "svelte";
	import { goto } from "$app/navigation";
	import { base } from "$app/paths";
	import { page } from "$app/state";

	import { error } from "$lib/stores/errors";
	import { createSettingsStore } from "$lib/stores/settings";
	import { loading } from "$lib/stores/loading";

	import Toast from "$lib/components/Toast.svelte";
	import NavMenu from "$lib/components/NavMenu.svelte";
	import MobileNav from "$lib/components/MobileNav.svelte";
	import titleUpdate from "$lib/stores/titleUpdate";
	import WelcomeModal from "$lib/components/WelcomeModal.svelte";
	import ExpandNavigation from "$lib/components/ExpandNavigation.svelte";
	import { setContext } from "svelte";
	import { handleResponse, useAPIClient } from "$lib/APIClient";
	import { isAborted } from "$lib/stores/isAborted";
	import IconShare from "$lib/components/icons/IconShare.svelte";
	import { shareModal } from "$lib/stores/shareModal";
	import BackgroundGenerationPoller from "$lib/components/BackgroundGenerationPoller.svelte";
	import { requireAuthUser } from "$lib/utils/auth";
	import Logo from "$lib/components/icons/Logo.svelte";
	import CarbonImage from "~icons/carbon/image";
	import CarbonSettings from "~icons/carbon/settings";
	import CarbonCube from "~icons/carbon/cube";
	import CarbonRainDrop from "~icons/carbon/rain-drop";
	import CarbonFavorite from "~icons/carbon/favorite";
	import IconSun from "$lib/components/icons/IconSun.svelte";
	import IconMoon from "$lib/components/icons/IconMoon.svelte";
	import {
		switchTheme,
		subscribeToTheme,
		getThemePreference,
		setTheme,
		type ThemePreference,
	} from "$lib/switchTheme";
	import IconNew from "$lib/components/icons/IconNew.svelte";
	import IconMCP from "$lib/components/icons/IconMCP.svelte";
	import { browser } from "$app/environment";
	import MCPServerManager from "$lib/components/mcp/MCPServerManager.svelte";
	import IconChatBubble from "$lib/components/icons/IconChatBubble.svelte";

	let { data = $bindable(), children } = $props();

	setContext("publicConfig", data.publicConfig);

	const publicConfig = data.publicConfig;
	const client = useAPIClient();

	let conversations = $state(data.conversations);
	$effect(() => {
		data.conversations && untrack(() => (conversations = data.conversations));
	});

	let isNavCollapsed = $state(false);
	let isDark = $state(false);
	let themePreference = $state<ThemePreference>("system");
	let unsubscribeTheme: (() => void) | undefined;
	let isMcpManagerOpen = $state(false);

	let errorToastTimeout: ReturnType<typeof setTimeout>;
	let currentError: string | undefined = $state();

	async function onError() {
		// If a new different error comes, wait for the current error to hide first
		if ($error && currentError && $error !== currentError) {
			clearTimeout(errorToastTimeout);
			currentError = undefined;
			await new Promise((resolve) => setTimeout(resolve, 300));
		}

		currentError = $error;

		errorToastTimeout = setTimeout(() => {
			$error = undefined;
			currentError = undefined;
		}, 5000);
	}

	function handleCollapsedNewChatClick(e: MouseEvent) {
		isAborted.set(true);
		if (requireAuthUser()) {
			e.preventDefault();
			return;
		}
		goto(`${base}/`, { invalidateAll: true });
	}

	let canShare = $derived(
		publicConfig.isHuggingChat &&
			Boolean(page.params?.id) &&
			page.route.id?.startsWith("/conversation/")
	);

	async function deleteConversation(id: string) {
		client
			.conversations({ id })
			.delete()
			.then(handleResponse)
			.then(async () => {
				conversations = conversations.filter((conv: { id: string }) => conv.id !== id);

				if (page.params.id === id) {
					await goto(`${base}/`, { invalidateAll: true });
				}
			})
			.catch((err) => {
				console.error(err);
				$error = String(err);
			});
	}

	async function editConversationTitle(id: string, title: string) {
		client
			.conversations({ id })
			.patch({ title })
			.then(handleResponse)
			.then(async () => {
				conversations = conversations.map((conv: { id: string; title: string }) =>
					conv.id === id ? { ...conv, title } : conv
				);
			})
			.catch((err) => {
				console.error(err);
				$error = String(err);
			});
	}

	function closeWelcomeModal() {
		if (requireAuthUser()) return;
		settings.set({ welcomeModalSeen: true });
	}

	onDestroy(() => {
		clearTimeout(errorToastTimeout);
		unsubscribeTheme?.();
	});

	$effect(() => {
		if ($error) onError();
	});

	$effect(() => {
		if ($titleUpdate) {
			const convIdx = conversations.findIndex(
				({ id }: { id: string }) => id === $titleUpdate?.convId
			);

			if (convIdx != -1) {
				conversations[convIdx].title = $titleUpdate?.title ?? conversations[convIdx].title;
			}

			$titleUpdate = null;
		}
	});

	const settings = createSettingsStore(data.settings);

	onMount(async () => {
		if (browser) {
			// تابع تغيّر الثيم داخل التطبيق
			unsubscribeTheme = subscribeToTheme(({ isDark: nextIsDark, preference }) => {
				isDark = nextIsDark;
				themePreference = preference;
			});

			// طبّق آخر ثيم مخزَّن في localStorage عند أول تحميل للصفحة
			const pref = getThemePreference();
			setTheme(pref);
		}

		if (page.url.searchParams.has("model")) {
			await settings
				.instantSet({
					activeModel: page.url.searchParams.get("model") ?? $settings.activeModel,
				})
				.then(async () => {
					const query = new URLSearchParams(page.url.searchParams.toString());
					query.delete("model");
					await goto(`${base}/?${query.toString()}`, {
						invalidateAll: true,
					});
				});
		}

		if (page.url.searchParams.has("token")) {
			const token = page.url.searchParams.get("token");

			await fetch(`${base}/api/user/validate-token`, {
				method: "POST",
				body: JSON.stringify({ token }),
			}).then(() => {
				goto(`${base}/`, { invalidateAll: true });
			});
		}

		// Global keyboard shortcut: New Chat (Ctrl/Cmd + Shift + O)
		const onKeydown = (e: KeyboardEvent) => {
			// Ignore when a modal has focus (app is inert)
			const appEl = document.getElementById("app");
			if (appEl?.hasAttribute("inert")) return;

			const oPressed = e.key?.toLowerCase() === "o";
			const metaOrCtrl = e.metaKey || e.ctrlKey;
			if (oPressed && e.shiftKey && metaOrCtrl) {
				e.preventDefault();
				isAborted.set(true);
				if (requireAuthUser()) return;
				goto(`${base}/`, { invalidateAll: true });
			}
		};

		window.addEventListener("keydown", onKeydown, { capture: true });
		onDestroy(() => window.removeEventListener("keydown", onKeydown, { capture: true }));
	});

	let mobileNavTitle = $derived(
		["/models", "/privacy"].includes(page.route.id ?? "")
			? ""
			: conversations.find((conv: { id: string }) => conv.id === page.params.id)?.title
	);

	// Show the welcome modal once on first app load
	let showWelcome = $derived(
		!$settings.welcomeModalSeen &&
			!(page.data.shared === true && page.route.id?.startsWith("/conversation/"))
	);
</script>

<svelte:head>
	<title>{publicConfig.PUBLIC_APP_NAME}</title>
	<meta name="description" content={publicConfig.PUBLIC_APP_DESCRIPTION} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:site" content="@huggingface" />

	<!-- use those meta tags everywhere except on special listing pages -->
	<!-- feel free to refacto if there's a better way -->
	{#if !page.url.pathname.includes("/models/")}
		<meta property="og:title" content={publicConfig.PUBLIC_APP_NAME} />
		<meta property="og:type" content="website" />
		<meta property="og:url" content="{publicConfig.PUBLIC_ORIGIN || page.url.origin}{base}" />
		<meta property="og:image" content="{publicConfig.assetPath}/thumbnail.png" />
		<meta property="og:description" content={publicConfig.PUBLIC_APP_DESCRIPTION} />
	{/if}
	<link rel="icon" href="{publicConfig.assetPath}/icon.svg" type="image/svg+xml" />
	{#if publicConfig.PUBLIC_ORIGIN}
		<link
			rel="icon"
			href="{publicConfig.assetPath}/favicon.svg"
			type="image/svg+xml"
			media="(prefers-color-scheme: light)"
		/>
		<link
			rel="icon"
			href="{publicConfig.assetPath}/favicon-dark.svg"
			type="image/svg+xml"
			media="(prefers-color-scheme: dark)"
		/>
	{:else}
		<link rel="icon" href="{publicConfig.assetPath}/favicon-dev.svg" type="image/svg+xml" />
	{/if}
	<link rel="apple-touch-icon" href="{publicConfig.assetPath}/apple-touch-icon.png" />
	<link rel="manifest" href="{publicConfig.assetPath}/manifest.json" />

	{#if publicConfig.PUBLIC_PLAUSIBLE_SCRIPT_URL}
		<script async src={publicConfig.PUBLIC_PLAUSIBLE_SCRIPT_URL}></script>
	{/if}

	{#if publicConfig.PUBLIC_APPLE_APP_ID}
		<meta name="apple-itunes-app" content={`app-id=${publicConfig.PUBLIC_APPLE_APP_ID}`} />
	{/if}
</svelte:head>

{#if showWelcome}
	<WelcomeModal close={closeWelcomeModal} />
{/if}

<BackgroundGenerationPoller />

<div
	class="fixed grid h-full w-screen grid-cols-1 grid-rows-[auto,1fr] overflow-hidden text-smd {!isNavCollapsed
		? 'md:grid-cols-[290px,1fr]'
		: 'md:grid-cols-[0px,1fr]'} transition-[300ms] [transition-property:grid-template-columns] dark:text-gray-300 md:grid-rows-[1fr]"
>
	<ExpandNavigation
		isCollapsed={isNavCollapsed}
		onClick={() => (isNavCollapsed = !isNavCollapsed)}
		classNames="absolute inset-y-0 z-20 my-auto {!isNavCollapsed
			? 'left-[290px]'
			: 'left-0'} *:transition-transform"
	/>

	{#if isNavCollapsed}
		<!-- شريط أيقونات رأسي يظهر عند إغلاق السايد بار -->
		<div
			class="pointer-events-none fixed inset-y-0 left-0 z-10 hidden w-14 flex-col justify-between border-r border-gray-800/60 bg-[#181a20] py-4 text-gray-300 md:flex"
		>
			<!-- أعلى الشريط: Avatar, Home, New Chat, Models, Gallery, MCP -->
			<div class="flex flex-col items-center gap-4">
				<!-- أفاتار المستخدم -->
				<a
					href="{base}/settings/account"
					onclick={(e) => {
						if (requireAuthUser()) {
							e.preventDefault();
						}
					}}
					class="pointer-events-auto flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-gray-200 bg-indigo-500 text-xs font-semibold uppercase text-white dark:border-gray-700"
					aria-label="Account"
					title="Account settings"
				>
					{#if data.user?.avatarUrl}
						<img
							src={data.user.avatarUrl}
							referrerpolicy="no-referrer"
							class="size-full rounded-full object-cover"
							alt={data.user.username || data.user.email}
							onerror={(e) => {
								const target = e.currentTarget as HTMLImageElement;
								target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
									data.user?.username || data.user?.email || "U"
								)}&background=6366f1&color=fff&size=128`;
							}}
						/>
					{:else}
						<span class="text-xs font-semibold uppercase">
							{(data.user?.username || data.user?.email || "U")[0]}
						</span>
					{/if}
				</a>
				<!-- زر الصفحة الرئيسية (الـ Chat الرئيسي) -->
				<a
					href="{base}/"
					onclick={(e) => {
						if (requireAuthUser()) {
							e.preventDefault();
						}
					}}
					class="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-lg text-gray-300 hover:bg-white/10"
					aria-label="Home"
					title="Chat home"
				>
					<IconChatBubble classNames="size-6" />
				</a>
				<!-- زر محادثة جديدة -->
				<a
					href="{base}/"
					onclick={handleCollapsedNewChatClick}
					class="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-lg text-gray-300 hover:bg-white/10"
					aria-label="New Chat"
					title="New Chat"
				>
					<IconNew classNames="text-xl" />
				</a>
				<!-- زر المودلز بأيقونة مختلفة -->
				<a
					href="{base}/models"
					onclick={(e) => {
						if (requireAuthUser()) {
							e.preventDefault();
						}
					}}
					class="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-lg text-gray-300 hover:bg-white/10"
					aria-label="Models"
					title="Models"
				>
					<CarbonCube class="text-xl" />
				</a>
				<!-- زر الـ Gallery تحت New Chat مباشرة -->
				<a
					href="{base}/gallery"
					onclick={(e) => {
						if (requireAuthUser()) {
							e.preventDefault();
						}
					}}
					class="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-lg text-gray-300 hover:bg-white/10"
					aria-label="Gallery"
					title="Gallery"
				>
					<CarbonImage class="text-xl" />
				</a>
				<!-- زر MCP مباشرة بعد Gallery -->
				<button
					type="button"
					class="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-lg text-gray-300 hover:bg-white/10"
					aria-label="MCP Servers"
					title="MCP Servers"
					onclick={() => {
						if (requireAuthUser()) {
							return;
						}
						isMcpManagerOpen = true;
					}}
				>
					<IconMCP classNames="size-5" />
				</button>
			</div>
			<!-- الأسفل: Theme ثم Settings -->
			<div class="flex flex-col items-center gap-4">
				<button
					type="button"
					class="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-lg text-gray-300 hover:bg-white/10"
					aria-label="Toggle theme"
					onclick={() => {
						switchTheme();
					}}
					title="Theme"
				>
					{#if browser}
						{#if themePreference === "light" || (themePreference === "system" && !isDark)}
							<IconMoon />
						{:else if themePreference === "dark"}
							<IconSun classNames="text-zinc-400" />
						{:else if themePreference === "stone"}
							<CarbonFavorite class="text-red-400" />
						{:else if themePreference === "red"}
							<IconSun />
						{:else if themePreference === "indigo"}
							<CarbonRainDrop class="text-zinc-950" />
						{:else}
							<IconMoon />
						{/if}
					{/if}
				</button>
				<a
					href="{base}/settings/application"
					onclick={(e) => {
						if (requireAuthUser()) {
							e.preventDefault();
						}
					}}
					class="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-lg text-gray-300 hover:bg-white/10"
					aria-label="Settings"
					title="Settings"
				>
					<CarbonSettings class="text-xl" />
				</a>
			</div>
		</div>
	{/if}

	{#if canShare}
		<button
			type="button"
			class="hidden size-8 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-[#f3f4f6]/55 text-sm font-medium text-gray-700 shadow-sm hover:bg-[#e5e7eb] hover:text-gray-500 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-200 dark:hover:bg-gray-700 md:absolute md:right-6 md:top-5 md:flex
				{$loading ? 'cursor-not-allowed opacity-40' : ''}"
			onclick={() => shareModal.open()}
			aria-label="Share conversation"
			disabled={$loading}
		>
			<IconShare />
		</button>
	{/if}

	<MobileNav title={mobileNavTitle}>
		<NavMenu
			{conversations}
			user={data.user}
			ondeleteConversation={(id) => deleteConversation(id)}
			oneditConversationTitle={(payload) => editConversationTitle(payload.id, payload.title)}
		/>
	</MobileNav>
	<nav
		class="grid max-h-dvh grid-cols-1 grid-rows-[auto,1fr,auto] overflow-hidden *:w-[290px] max-md:hidden"
	>
		<NavMenu
			{conversations}
			user={data.user}
			ondeleteConversation={(id) => deleteConversation(id)}
			oneditConversationTitle={(payload) => editConversationTitle(payload.id, payload.title)}
		/>
	</nav>
	{#if currentError}
		<Toast message={currentError} />
	{/if}
	{@render children?.()}

	{#if publicConfig.PUBLIC_PLAUSIBLE_SCRIPT_URL}
		<script>
			((window.plausible =
				window.plausible ||
				function () {
					(plausible.q = plausible.q || []).push(arguments);
				}),
				(plausible.init =
					plausible.init ||
					function (i) {
						plausible.o = i || {};
					}));
			plausible.init();
		</script>
	{/if}

	{#if isMcpManagerOpen}
		<MCPServerManager onclose={() => (isMcpManagerOpen = false)} />
	{/if}
</div>
