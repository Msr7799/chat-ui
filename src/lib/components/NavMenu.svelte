<script lang="ts" module>
	export const titles: { [key: string]: string } = {
		today: "Today",
		week: "This week",
		month: "This month",
		older: "Older",
	} as const;
</script>

<script lang="ts">
	import { base } from "$app/paths";
	import { resolve } from "$app/paths";

	import Logo from "$lib/components/icons/Logo.svelte";
	import IconNew from "$lib/components/icons/IconNew.svelte";
	import CarbonUser from "~icons/carbon/user";
	import IconGoogle from "$lib/components/icons/IconGoogle.svelte";
	import CarbonSettings from "~icons/carbon/settings";
	import CarbonLogout from "~icons/carbon/logout";
	import CarbonCube from "~icons/carbon/cube";
	import CarbonSearch from "~icons/carbon/search";
	import CarbonClose from "~icons/carbon/close";
	import CarbonTrash from "~icons/carbon/trash-can";
	import CarbonCheckmark from "~icons/carbon/checkmark";
	import CarbonRainDrop from "~icons/carbon/rain-drop";
	import CarbonSun from "~icons/carbon/sun";
	import CarbonFavorite from "~icons/carbon/favorite";
	import IconSun from "$lib/components/icons/IconSun.svelte";
	import IconMoon from "$lib/components/icons/IconMoon.svelte";
	import IconMCP from "$lib/components/icons/IconMCP.svelte";
	import { switchTheme, subscribeToTheme, type ThemePreference } from "$lib/switchTheme";
	import { isAborted } from "$lib/stores/isAborted";
	import { onDestroy } from "svelte";
	import { get } from "svelte/store";

	import NavConversationItem from "./NavConversationItem.svelte";
	import type { LayoutData } from "../../routes/$types";
	import type { ConvSidebar } from "$lib/types/ConvSidebar";
	import type { Model } from "$lib/types/Model";
	import { page } from "$app/stores";
	import InfiniteScroll from "./InfiniteScroll.svelte";
	import { CONV_NUM_PER_PAGE } from "$lib/constants/pagination";
	import { browser } from "$app/environment";
	import { usePublicConfig } from "$lib/utils/PublicConfig.svelte";
	import { useAPIClient, handleResponse } from "$lib/APIClient";
	import { requireAuthUser } from "$lib/utils/auth";
	import { enabledServersCount } from "$lib/stores/mcpServers";
	import MCPServerManager from "./mcp/MCPServerManager.svelte";
	import IconGoogleVideo from "./icons/IconGoogleVideo.svelte";

	const publicConfig = usePublicConfig();
	const client = useAPIClient();

	interface Props {
		conversations: ConvSidebar[];
		user: LayoutData["user"];
		p?: number;
		ondeleteConversation?: (id: string) => void;
		oneditConversationTitle?: (payload: { id: string; title: string }) => void;
	}

	let {
		conversations = $bindable(),
		user,
		p = $bindable(0),
		ondeleteConversation,
		oneditConversationTitle,
	}: Props = $props();

	let hasMore = $state(true);

	let isDark = $state(false);
	let themePreference = $state<ThemePreference>("system");

	$effect(() => {
		return subscribeToTheme(({ preference, isDark: dark }) => {
			themePreference = preference;
			isDark = dark;
		});
	});

	// Online Duration Logic
	function formatDuration(ms: number | undefined) {
		if (!ms) return "0m";
		const minutes = Math.floor(ms / 60000);
		const hours = Math.floor(minutes / 60);
		const remainingMinutes = minutes % 60;

		if (hours > 0) {
			return `${hours}h ${remainingMinutes}m`;
		}
		return `${remainingMinutes}m`;
	}

	// Calculate current online duration if user is logged in
	let currentDuration = $derived(
		// @ts-ignore - lastLoginAt and onlineDuration are added dynamically
		((user?.onlineDuration || 0) as number) +
			// @ts-ignore
			(user?.lastLoginAt ? new Date().getTime() - new Date(user.lastLoginAt).getTime() : 0)
	);

	function handleNewChatClick(e: MouseEvent) {
		isAborted.set(true);

		if (requireAuthUser()) {
			e.preventDefault();
		}
	}

	function handleNavItemClick(e: MouseEvent) {
		if (requireAuthUser()) {
			e.preventDefault();
		}
	}

	function handleLogin() {
		const currentPath = get(page).url.pathname + get(page).url.search;
		window.location.href = resolve("/login") + `?next=${encodeURIComponent(currentPath)}`;
	}

	async function handleLogout() {
		try {
			const logoutUrl = resolve("/logout"); // Or /api/v2/logout depending on implementation, typically /logout route handles it
			// Use fetch to post to logout route
			const response = await fetch(logoutUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (response.ok || response.redirected) {
				window.location.href = resolve("/");
			}
		} catch (error) {
			console.error("Logout failed:", error);
		}
	}

	function handleAvatarError(e: Event) {
		const target = e.currentTarget as HTMLImageElement | null;
		if (!target) return;
		const name = user?.username || user?.email || "U";
		target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&size=128`;
	}

	const dateRanges = [
		new Date().setDate(new Date().getDate() - 1),
		new Date().setDate(new Date().getDate() - 7),
		new Date().setMonth(new Date().getMonth() - 1),
	];

	let groupedConversations = $derived({
		today: conversations.filter(({ updatedAt }) => updatedAt.getTime() > dateRanges[0]),
		week: conversations.filter(
			({ updatedAt }) => updatedAt.getTime() > dateRanges[1] && updatedAt.getTime() < dateRanges[0]
		),
		month: conversations.filter(
			({ updatedAt }) => updatedAt.getTime() > dateRanges[2] && updatedAt.getTime() < dateRanges[1]
		),
		older: conversations.filter(({ updatedAt }) => updatedAt.getTime() < dateRanges[2]),
	});

	const nModels: number = get(page).data.models.filter((el: Model) => !el.unlisted).length;

	async function handleVisible() {
		p++;
		const response = await client.conversations
			.get({
				query: {
					p,
				},
			})
			.then(handleResponse)
			.catch(() => null);

		const newConvs = response && "conversations" in response ? response.conversations : [];

		if (newConvs.length === 0) {
			hasMore = false;
		}

		conversations = [...conversations, ...newConvs];
	}

	$effect(() => {
		if (conversations.length <= CONV_NUM_PER_PAGE) {
			// reset p to 0 if there's only one page of content
			// that would be caused by a data loading invalidation
			p = 0;
		}
	});

	let showMcpModal = $state(false);
	let showUserMenu = $state(false);
	let searchQuery = $state("");
	let isSelectionMode = $state(false);
	let selectedConversations = $state<Set<string>>(new Set());

	// Filter conversations based on search query
	let filteredConversations = $derived(
		searchQuery.trim()
			? conversations.filter((conv) => conv.title.toLowerCase().includes(searchQuery.toLowerCase()))
			: conversations
	);

	// Group filtered conversations
	let filteredGroupedConversations = $derived({
		today: filteredConversations.filter(({ updatedAt }) => updatedAt.getTime() > dateRanges[0]),
		week: filteredConversations.filter(
			({ updatedAt }) => updatedAt.getTime() > dateRanges[1] && updatedAt.getTime() < dateRanges[0]
		),
		month: filteredConversations.filter(
			({ updatedAt }) => updatedAt.getTime() > dateRanges[2] && updatedAt.getTime() < dateRanges[1]
		),
		older: filteredConversations.filter(({ updatedAt }) => updatedAt.getTime() < dateRanges[2]),
	});

	function toggleSelectionMode() {
		isSelectionMode = !isSelectionMode;
		if (!isSelectionMode) {
			selectedConversations.clear();
		}
	}

	function toggleConversationSelection(id: string) {
		if (selectedConversations.has(id)) {
			selectedConversations.delete(id);
		} else {
			selectedConversations.add(id);
		}
		selectedConversations = new Set(selectedConversations);
	}

	async function deleteSelectedConversations() {
		if (selectedConversations.size === 0) return;

		const confirmMessage = `Delete ${selectedConversations.size} conversation${selectedConversations.size > 1 ? "s" : ""}?`;
		if (!confirm(confirmMessage)) return;

		const idsToDelete = Array.from(selectedConversations);

		for (const id of idsToDelete) {
			try {
				await client.conversations({ id }).delete().then(handleResponse);
				conversations = conversations.filter((conv) => conv.id !== id);
			} catch (err) {
				console.error(`Failed to delete conversation ${id}:`, err);
			}
		}

		selectedConversations.clear();
		isSelectionMode = false;
	}
</script>

<div
	class="sticky top-0 z-20 flex flex-none touch-none items-center justify-between bg-white px-1.5 py-3.5 dark:bg-gray-900 max-sm:pt-0"
>
	<a
		class="flex select-none items-center rounded-xl text-lg font-semibold"
		href="{publicConfig.PUBLIC_ORIGIN}{base}/"
	>
		<Logo classNames="dark:invert mr-[2px]" />
		{publicConfig.PUBLIC_APP_NAME}
	</a>
	<div class="flex items-center gap-2">
		{#if isSelectionMode}
			<button
				onclick={toggleSelectionMode}
				class="flex size-9 items-center justify-center rounded-lg border bg-white text-gray-700 shadow-sm transition-all hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
				title="Cancel Selection"
				aria-label="Cancel Selection"
			>
				<CarbonClose class="text-xl" />
			</button>
			{#if selectedConversations.size > 0}
				<button
					onclick={deleteSelectedConversations}
					class="flex size-9 items-center justify-center rounded-lg border bg-red-600 text-white shadow-sm transition-all hover:bg-red-700"
					title="Delete Selected ({selectedConversations.size})"
					aria-label="Delete Selected"
				>
					<CarbonTrash class="text-xl" />
				</button>
			{/if}
		{:else}
			<button
				onclick={toggleSelectionMode}
				class="flex size-9 items-center justify-center rounded-lg border bg-white text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
				title="Select Conversations"
				aria-label="Select Conversations"
			>
				<CarbonCheckmark class="text-xl" />
			</button>
		{/if}
		<a
			href={`${base}/`}
			onclick={handleNewChatClick}
			class="flex size-9 items-center justify-center rounded-lg border bg-white text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
			title="New Chat (Ctrl/Cmd + Shift + O)"
			aria-label="New Chat"
		>
			<IconNew classNames="text-xl" />
		</a>
		{#if user?.username || user?.email}
			<div class="relative">
				<button
					onclick={() => (showUserMenu = !showUserMenu)}
					class="flex size-9 items-center justify-center rounded-full border-2 border-gray-200 bg-indigo-500 text-white shadow-sm transition-all hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
					aria-label="User menu"
				>
					{#if user.avatarUrl}
						<img
							src={user.avatarUrl}
							referrerpolicy="no-referrer"
							class="size-full rounded-full object-cover"
							alt={user.username || user.email}
							onerror={handleAvatarError}
						/>
					{:else}
						<span class="text-lg font-semibold uppercase">
							{(user.username || user.email || "U")[0]}
						</span>
					{/if}
				</button>
				{#if showUserMenu}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="fixed inset-0 z-40" onclick={() => (showUserMenu = false)}></div>
					<div
						class="absolute right-0 top-12 z-50 w-64 rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800"
					>
						<div class="border-b border-gray-200 p-4 dark:border-gray-700">
							<div class="flex items-center gap-3">
								<div
									class="flex size-12 items-center justify-center rounded-full border-2 border-gray-200 bg-indigo-500 text-white dark:border-gray-700"
								>
									{#if user.avatarUrl}
										<img
											src={user.avatarUrl}
											referrerpolicy="no-referrer"
											class="size-full rounded-full object-cover"
											alt={user.username || user.email}
											onerror={handleAvatarError}
										/>
									{:else}
										<span class="text-xl font-semibold uppercase">
											{(user.username || user.email || "U")[0]}
										</span>
									{/if}
								</div>
								<div class="flex-1 overflow-hidden">
									<p class="truncate font-semibold text-gray-900 dark:text-gray-100">
										{user.username || user.email}
									</p>
									{#if user.email && user.username}
										<p class="truncate text-xs text-gray-500 dark:text-gray-400">
											{user.email}
										</p>
									{/if}
									{#if currentDuration}
										<p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
											Online: {formatDuration(currentDuration)}
										</p>
									{/if}
								</div>
							</div>
						</div>
						<div class="p-2">
							<a
								href="{base}/settings/account"
								class="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
								onclick={() => (showUserMenu = false)}
							>
								<CarbonUser class="text-lg" />
								<span>Account</span>
							</a>
							<a
								href="{base}/settings/application"
								class="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
								onclick={() => (showUserMenu = false)}
							>
								<CarbonSettings class="text-lg" />
								<span>Settings</span>
							</a>
							<hr class="my-1 border-gray-200 dark:border-gray-700" />
							<button
								onclick={() => {
									showUserMenu = false;
									handleLogout();
								}}
								class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
							>
								<CarbonLogout class="text-lg" />
								<span>Sign Out</span>
							</button>
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<button
				onclick={handleLogin}
				class="flex size-9 items-center justify-center rounded-full border-2 border-gray-300 bg-gray-100 transition-all hover:border-gray-400 hover:bg-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:hover:border-gray-500 dark:hover:bg-gray-600"
				aria-label="Sign in"
			>
				<CarbonUser class="text-lg text-gray-600 dark:text-gray-300" />
			</button>
		{/if}
	</div>
</div>

<!-- Search Input -->
<div class="px-3 pb-2">
	<div class="relative">
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Search conversations..."
			class="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-9 text-sm text-gray-900 placeholder-gray-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
		/>
		<CarbonSearch class="absolute left-2.5 top-1/2 -translate-y-1/2 text-lg text-gray-400" />
		{#if searchQuery}
			<button
				onclick={() => (searchQuery = "")}
				class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
				aria-label="Clear search"
			>
				<CarbonClose class="text-base" />
			</button>
		{/if}
	</div>
</div>

<div
	class="scrollbar-custom flex touch-pan-y flex-col gap-1 overflow-y-auto rounded-r-xl border border-l-0 border-gray-100 from-gray-50 px-3 pb-3 pt-2 text-[.9rem] dark:border-transparent dark:from-gray-800/30 max-sm:bg-gradient-to-t md:bg-gradient-to-l"
>
	<div class="flex flex-col gap-0.5">
		{#each Object.entries(filteredGroupedConversations) as [group, convs]}
			{#if convs.length}
				<h4 class="mb-1.5 mt-4 pl-0.5 text-sm text-gray-400 first:mt-0 dark:text-gray-500">
					{titles[group]}
				</h4>
				{#each convs as conv}
					<NavConversationItem
						{conv}
						{oneditConversationTitle}
						{ondeleteConversation}
						{isSelectionMode}
						isSelected={selectedConversations.has(conv.id)}
						onToggleSelection={() => toggleConversationSelection(conv.id)}
					/>
				{/each}
			{/if}
		{/each}
	</div>
	{#if hasMore}
		<InfiniteScroll onvisible={handleVisible} />
	{/if}
</div>

<div
	class="flex touch-none flex-col gap-1 rounded-r-xl border border-l-0 border-gray-100 p-3 text-sm dark:border-transparent md:mt-3 md:bg-gradient-to-l md:from-gray-50 md:dark:from-gray-800/30"
>
	<a
		href="{base}/models"
		class="flex h-9 flex-none items-center gap-1.5 rounded-lg pl-2.5 pr-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
		onclick={handleNavItemClick}
	>
		<CarbonCube class="text-lg" />
		<span>Models</span>
		<span
			class="ml-auto rounded-md bg-gray-500/5 px-1.5 py-0.5 text-xs text-gray-400 dark:bg-gray-500/20 dark:text-gray-400"
		>
			{nModels}
		</span>
	</a>

	<a
		href="{base}/google-images"
		class="flex h-9 flex-none items-center gap-1.5 rounded-lg pl-2.5 pr-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
		onclick={handleNavItemClick}
	>
		<IconGoogle classNames="text-lg" />
		<span>Google Images</span>
	</a>

	<a
		href="{base}/google-videos"
		class="flex flex-none items-center gap-1 rounded-lg pl-2.5 pr-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
		onclick={handleNavItemClick}
	>
		<IconGoogleVideo classNames="text-lg" />
		<span>Google Videos</span>
	</a>

	<a
		href="{base}/settings/application"
		class="flex h-9 flex-none items-center gap-1.5 rounded-lg pl-2.5 pr-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
		onclick={handleNavItemClick}
	>
		<CarbonSettings class="text-lg" />
		<span>Settings</span>
	</a>

	{#if user?.username || user?.email}
		<button
			onclick={() => (showMcpModal = true)}
			class="flex h-9 flex-none items-center gap-1.5 rounded-lg pl-2.5 pr-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
		>
			<IconMCP classNames="text-[1.05rem]" />
			<span>MCP Servers</span>
			{#if $enabledServersCount > 0}
				<span
					class="ml-auto rounded-md bg-blue-600/10 px-1.5 py-0.5 text-xs text-blue-600 dark:bg-blue-600/20 dark:text-blue-400"
				>
					{$enabledServersCount}
				</span>
			{/if}
		</button>
	{/if}
	<button
		onclick={() => {
			switchTheme();
		}}
		aria-label="Toggle theme"
		class="flex h-9 flex-none items-center gap-1.5 rounded-lg pl-2.5 pr-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
	>
		{#if browser}
			{#if themePreference === "light" || (themePreference === "system" && !isDark)}
				<IconMoon />
			{:else if themePreference === "dark"}
				<CarbonSun class="text-zinc-400" />
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
		<span>Theme</span>
	</button>
</div>

{#if showMcpModal}
	<MCPServerManager onclose={() => (showMcpModal = false)} />
{/if}
