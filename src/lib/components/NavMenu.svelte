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
	import CarbonImage from "~icons/carbon/image";
	import CarbonSettings from "~icons/carbon/settings";
	import CarbonLogout from "~icons/carbon/logout";
	import IconSun from "$lib/components/icons/IconSun.svelte";
	import IconMoon from "$lib/components/icons/IconMoon.svelte";
	import IconMCP from "$lib/components/icons/IconMCP.svelte";
	import { switchTheme, subscribeToTheme } from "$lib/switchTheme";
	import { isAborted } from "$lib/stores/isAborted";
	import { onDestroy } from "svelte";

	import NavConversationItem from "./NavConversationItem.svelte";
	import type { LayoutData } from "../../routes/$types";
	import type { ConvSidebar } from "$lib/types/ConvSidebar";
	import type { Model } from "$lib/types/Model";
	import { page } from "$app/state";
	import InfiniteScroll from "./InfiniteScroll.svelte";
	import { CONV_NUM_PER_PAGE } from "$lib/constants/pagination";
	import { browser } from "$app/environment";
	import { usePublicConfig } from "$lib/utils/PublicConfig.svelte";
	import { useAPIClient, handleResponse } from "$lib/APIClient";
	import { requireAuthUser } from "$lib/utils/auth";
	import { enabledServersCount } from "$lib/stores/mcpServers";
	import MCPServerManager from "./mcp/MCPServerManager.svelte";

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
		const currentPath = page.url.pathname + page.url.search;
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

	const nModels: number = page.data.models.filter((el: Model) => !el.unlisted).length;

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

	let isDark = $state(false);
	let unsubscribeTheme: (() => void) | undefined;
	let showMcpModal = $state(false);
	let showUserMenu = $state(false);

	if (browser) {
		unsubscribeTheme = subscribeToTheme(({ isDark: nextIsDark }) => {
			isDark = nextIsDark;
		});
	}

	onDestroy(() => {
		unsubscribeTheme?.();
	});
</script>

<div
	class="sticky top-0 flex flex-none touch-none items-center justify-between px-1.5 py-3.5 max-sm:pt-0"
>
	<a
		class="flex select-none items-center rounded-xl text-lg font-semibold"
		href="{publicConfig.PUBLIC_ORIGIN}{base}/"
	>
		<Logo classNames="dark:invert mr-[2px]" />
		{publicConfig.PUBLIC_APP_NAME}
	</a>
	<div class="flex items-center gap-2">
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
							onerror={(e) => {
								const target = e.currentTarget as HTMLImageElement;
								target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || user.email || "U")}&background=6366f1&color=fff&size=128`;
							}}
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
											onerror={(e) => {
												const target = e.currentTarget as HTMLImageElement;
												target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || user.email || "U")}&background=6366f1&color=fff&size=128`;
											}}
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

<div
	class="scrollbar-custom flex touch-pan-y flex-col gap-1 overflow-y-auto rounded-r-xl border border-l-0 border-gray-100 from-gray-50 px-3 pb-3 pt-2 text-[.9rem] dark:border-transparent dark:from-gray-800/30 max-sm:bg-gradient-to-t md:bg-gradient-to-l"
>
	<div class="flex flex-col gap-0.5">
		{#each Object.entries(groupedConversations) as [group, convs]}
			{#if convs.length}
				<h4 class="mb-1.5 mt-4 pl-0.5 text-sm text-gray-400 first:mt-0 dark:text-gray-500">
					{titles[group]}
				</h4>
				{#each convs as conv}
					<NavConversationItem {conv} {oneditConversationTitle} {ondeleteConversation} />
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
		Models
		<span
			class="ml-auto rounded-md bg-gray-500/5 px-1.5 py-0.5 text-xs text-gray-400 dark:bg-gray-500/20 dark:text-gray-400"
		>
			{nModels}
		</span>
	</a>

	<a
		href="{base}/gallery"
		class="flex h-9 flex-none items-center gap-1.5 rounded-lg pl-2.5 pr-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
		onclick={handleNavItemClick}
	>
		<CarbonImage class="text-lg" />
		<span>Gallery</span>
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
			{#if isDark}
				<IconSun />
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
