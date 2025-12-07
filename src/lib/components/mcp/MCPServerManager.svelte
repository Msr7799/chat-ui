<script lang="ts">
	import { usePublicConfig } from "$lib/utils/PublicConfig.svelte";
	import Modal from "$lib/components/Modal.svelte";
	import ServerCard from "./ServerCard.svelte";
	import AddServerForm from "./AddServerForm.svelte";
	import ImportConfigForm from "./ImportConfigForm.svelte";
	import {
		allMcpServers,
		selectedServerIds,
		enabledServersCount,
		addCustomServer,
		refreshMcpServers,
		healthCheckServer,
	} from "$lib/stores/mcpServers";
	import type { KeyValuePair } from "$lib/types/Tool";
	import IconAddLarge from "~icons/carbon/add-large";
	import IconRefresh from "~icons/carbon/renew";
	import IconUpload from "~icons/carbon/upload";
	import LucideHammer from "~icons/lucide/hammer";
	import IconMCP from "$lib/components/icons/IconMCP.svelte";
	import { base } from "$app/paths";

	const publicConfig = usePublicConfig();

	interface Props {
		onclose: () => void;
	}

	let { onclose }: Props = $props();

	type View = "list" | "add" | "import";
	let currentView = $state<View>("list");
	let isRefreshing = $state(false);
	let isImporting = $state(false);

	const baseServers = $derived($allMcpServers.filter((s) => s.type === "base"));
	const customServers = $derived($allMcpServers.filter((s) => s.type === "custom"));
	const enabledCount = $derived($enabledServersCount);

	function handleAddServer(serverData: { name: string; url: string; headers?: KeyValuePair[] }) {
		addCustomServer(serverData);
		currentView = "list";
	}

	function handleCancel() {
		currentView = "list";
	}

	async function handleRefresh() {
		if (isRefreshing) return;
		isRefreshing = true;
		try {
			await refreshMcpServers();
			// After refreshing the list, re-run health checks for all known servers
			const servers = $allMcpServers;
			await Promise.allSettled(servers.map((s) => healthCheckServer(s)));
		} finally {
			isRefreshing = false;
		}
	}

	async function handleImportConfig(config: unknown) {
		if (isImporting) return;
		isImporting = true;
		try {
			const response = await fetch(`${base}/api/mcp/local-config`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(config),
			});

			if (!response.ok) {
				const error = await response.text();
				throw new Error(error || "Failed to import configuration");
			}

			// Refresh the server list to show newly imported servers
			await refreshMcpServers();
			currentView = "list";
		} catch (error) {
			console.error("Failed to import config:", error);
			alert(
				`Failed to import configuration: ${error instanceof Error ? error.message : "Unknown error"}`
			);
		} finally {
			isImporting = false;
		}
	}
</script>

<Modal
	width={currentView === "list"
		? "w-full max-w-[800px] sm:w-[600px] md:w-[800px]"
		: "w-full max-w-[600px] sm:w-[500px] md:w-[600px]"}
	{onclose}
	closeButton
>
	<div class="p-6">
		<!-- Header -->
		<div class="mb-6">
			<h2 class="mb-1 text-xl font-semibold text-gray-900 dark:text-gray-200">
				{#if currentView === "list"}
					MCP Servers
				{:else if currentView === "add"}
					Add MCP server
				{:else}
					Import MCP Configuration
				{/if}
			</h2>
			<p class="text-sm text-gray-600 dark:text-gray-400">
				{#if currentView === "list"}
					Manage MCP servers to extend {publicConfig.PUBLIC_APP_NAME} with external tools.
				{:else if currentView === "add"}
					Add a custom MCP server to {publicConfig.PUBLIC_APP_NAME}.
				{:else}
					Import local MCP servers from JSON configuration (Windsurf/VS Code format).
				{/if}
			</p>
		</div>

		<!-- Content -->
		{#if currentView === "list"}
			<div
				class="mb-6 flex justify-between rounded-lg p-4 max-sm:flex-col max-sm:gap-4 sm:items-center {!enabledCount
					? 'bg-gray-100 dark:bg-white/5'
					: 'bg-blue-50 dark:bg-blue-900/10'}"
			>
				<div class="flex items-center gap-3">
					<div
						class="flex size-10 items-center justify-center rounded-xl bg-blue-500/10"
						class:grayscale={!enabledCount}
					>
						<IconMCP classNames="size-8 text-blue-600 dark:text-blue-500" />
					</div>
					<div>
						<p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
							{$allMcpServers.length}
							{$allMcpServers.length === 1 ? "server" : "servers"} configured
						</p>
						<p class="text-xs text-gray-600 dark:text-gray-400">
							{enabledCount} enabled
						</p>
					</div>
				</div>

				<div class="flex w-full flex-wrap justify-end gap-2">
					<button
						onclick={handleRefresh}
						disabled={isRefreshing}
						class="btn gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
					>
						<IconRefresh class="size-4 {isRefreshing ? 'animate-spin' : ''}" />
						{isRefreshing ? "Refreshing…" : "Refresh"}
					</button>
					<button
						onclick={() => (currentView = "import")}
						class="btn flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
					>
						<IconUpload class="size-4" />
						Import JSON
					</button>
					<button
						onclick={() => (currentView = "add")}
						class="btn flex items-center gap-0.5 rounded-lg bg-blue-600 py-1.5 pl-2 pr-3 text-sm font-medium text-white hover:bg-blue-600"
					>
						<IconAddLarge class="size-4" />
						Add Server
					</button>
				</div>
			</div>
			<div class="space-y-5">
				<!-- Base Servers -->
				{#if baseServers.length > 0}
					<div>
						<h3 class="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
							Base Servers ({baseServers.length})
						</h3>
						<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
							{#each baseServers as server (server.id)}
								<ServerCard {server} isSelected={$selectedServerIds.has(server.id)} />
							{/each}
						</div>
					</div>
				{/if}

				<!-- Custom Servers -->
				<div>
					<h3 class="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
						Custom Servers ({customServers.length})
					</h3>
					{#if customServers.length === 0}
						<div
							class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 dark:border-gray-700"
						>
							<LucideHammer class="mb-3 size-12 text-gray-400" />
							<p class="mb-1 text-sm font-medium text-gray-900 dark:text-gray-100">
								No custom servers yet
							</p>
							<p class="mb-4 text-xs text-gray-600 dark:text-gray-400">
								Add your own MCP servers with custom tools
							</p>
							<button
								onclick={() => (currentView = "add")}
								class="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
							>
								<IconAddLarge class="size-4" />
								Add Your First Server
							</button>
						</div>
					{:else}
						<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
							{#each customServers as server (server.id)}
								<ServerCard {server} isSelected={$selectedServerIds.has(server.id)} />
							{/each}
						</div>
					{/if}
				</div>

				<!-- Help Text -->
				<div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
					<h4 class="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">💡 Quick Tips</h4>
					<ul class="space-y-1 text-xs text-gray-600 dark:text-gray-400">
						<li>• Only connect to servers you trust</li>
						<li>• Enable servers to make their tools available in chat</li>
						<li>• Use the Health Check button to verify server connectivity</li>
						<li>• You can add HTTP headers for authentication when required</li>
					</ul>
				</div>
			</div>
		{:else if currentView === "add"}
			<AddServerForm onsubmit={handleAddServer} oncancel={handleCancel} />
		{:else if currentView === "import"}
			<ImportConfigForm onsubmit={handleImportConfig} oncancel={handleCancel} />
		{/if}
	</div>
</Modal>
