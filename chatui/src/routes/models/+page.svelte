<script lang="ts">
	import type { PageData } from "./$types";
	import { usePublicConfig } from "$lib/utils/PublicConfig.svelte";

	import { base } from "$app/paths";
	import { page } from "$app/state";

	import CarbonHelpFilled from "~icons/carbon/help-filled";
	import LucideHammer from "~icons/lucide/hammer";
	import LucideImage from "~icons/lucide/image";
	import LucideSettings from "~icons/lucide/settings";
	import { useSettingsStore } from "$lib/stores/settings";
	import { goto } from "$app/navigation";
	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const settings = useSettingsStore();

	const publicConfig = usePublicConfig();

	// Local filter state for model search (hyphen/space insensitive)
	let modelFilter = $state("");
	const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ");
	let queryTokens = $derived(normalize(modelFilter).trim().split(/\s+/).filter(Boolean));

	// Filtered models list
	let filteredModels = $derived(
		data.models
			.filter((el) => !el.unlisted)
			.filter((el) => {
				const haystack = normalize(`${el.id} ${el.name ?? ""} ${el.displayName ?? ""}`);
				return queryTokens.every((q) => haystack.includes(q));
			})
	);
</script>

<svelte:head>
	{#if publicConfig.isHuggingChat}
		<title>HuggingChat - Models</title>
		<meta property="og:title" content="HuggingChat - Models" />
		<meta property="og:type" content="link" />
		<meta property="og:description" content="Browse HuggingChat available models" />
		<meta property="og:url" content={page.url.href} />
	{/if}
</svelte:head>

<div class="scrollbar-custom h-full overflow-y-auto py-12 max-sm:pt-8 md:py-24 md:pl-14">
	<div class="pt-42 mx-auto flex flex-col px-5 xl:w-[60rem] 2xl:w-[64rem]">
		<div class="flex items-center">
			<h1 class="text-xl font-bold sm:text-2xl">Models</h1>
			{#if publicConfig.isHuggingChat}
				<a
					href="https://huggingface.co/docs/inference-providers"
					class="ml-auto text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
					target="_blank"
					aria-label="Hub discussion about models"
				>
					<CarbonHelpFilled />
				</a>
			{/if}
		</div>
		<h2 class="text-gray-500">
			All models available{#if publicConfig.isHuggingChat}&nbsp;via <a
					target="_blank"
					href="https://huggingface.co/inference/models"
					class="underline decoration-gray-300 hover:decoration-gray-500 dark:decoration-gray-600 dark:hover:decoration-gray-500"
					>Inference Providers</a
				>{/if}
		</h2>

		<!-- Filter input -->
		<input
			type="search"
			bind:value={modelFilter}
			placeholder="Search by name"
			aria-label="Search models by name or id"
			class="mt-4 w-full rounded-3xl border border-gray-300 bg-white px-5 py-2 text-[15px]
				placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300
				dark:border-gray-700 dark:bg-gray-900 dark:focus:ring-gray-700"
		/>

		<div class="mt-6 min-h-[50vh]">
			<div
				class="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
			>
				{#each filteredModels as model, index (model.id)}
					{@const isActive = model.id === $settings.activeModel}
					{@const isLast = index === filteredModels.length - 1}
					<a
						href="{base}/models/{model.id}"
						aria-label="Model card for {model.displayName}"
						class="group flex cursor-pointer items-center gap-2 p-3 sm:gap-4 sm:p-4
							{isActive
							? 'bg-gray-50 dark:bg-gray-800'
							: 'bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800'}
							{isLast ? '' : 'border-b border-gray-100 dark:border-gray-800'}"
					>
						<!-- Avatar -->
						<div class="flex-shrink-0">
							{#if model.isRouter}
								<!-- Omni Router Icon -->
								<div
									class="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 sm:size-10"
								>
									<svg
										class="size-5 sm:size-6"
										viewBox="0 0 17 17"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											d="M5.97736 12.1813C6.25011 12.516 6.57428 12.8946 6.98029 13.2741C5.89251 13.8066 4.44063 14.1305 2.34747 14.1306V12.7272C4.02144 12.7272 5.15855 12.5026 5.97736 12.1813ZM10.0789 6.00458C10.3483 6.3067 10.6247 6.56949 10.9725 6.79364C11.5911 7.19216 12.4914 7.49774 14.0526 7.49774V8.90204C12.4915 8.90204 11.5911 9.20765 10.9725 9.60614C10.6249 9.83013 10.3481 10.0924 10.0789 10.3942C9.78258 10.1597 9.52333 9.87047 9.21271 9.48798C9.18183 9.44996 9.14961 9.40984 9.11603 9.36786C9.42491 9.03403 9.77986 8.70638 10.2127 8.42743C10.3378 8.34683 10.4686 8.27118 10.6053 8.19989C10.4686 8.12858 10.3378 8.05297 10.2127 7.97235C9.77958 7.69322 9.42506 7.365 9.11603 7.03094C9.1494 6.98922 9.18201 6.9496 9.21271 6.9118C9.52349 6.52912 9.78237 6.2392 10.0789 6.00458ZM2.34747 2.26923C4.44032 2.26927 5.89256 2.59232 6.98029 3.12469C6.57429 3.50414 6.25012 3.8828 5.97736 4.21747C5.15858 3.89631 4.02115 3.67356 2.34747 3.67352V2.26923Z"
											fill="white"
											fill-opacity="0.6"
										/>
										<path
											d="M14.052 3.67331C12.0512 3.67337 10.8161 3.98917 9.97647 4.41441C9.14382 4.83623 8.63688 5.39533 8.12318 6.02791C7.62178 6.64535 7.06413 7.40735 6.18741 7.97235C6.06225 8.053 5.93137 8.12889 5.79462 8.20022C5.93144 8.27158 6.06219 8.34739 6.18741 8.42808C7.06422 8.99314 7.62174 9.75505 8.12318 10.3725C8.6369 11.0051 9.14374 11.5642 9.97647 11.986C10.8161 12.4113 12.0512 12.7271 14.052 12.7271V14.1312C11.9098 14.1311 10.4387 13.7932 9.34279 13.2382C8.24007 12.6797 7.58149 11.9313 7.03377 11.2569C6.47365 10.5671 6.07238 10.0218 5.42786 9.60647C4.80925 9.20786 3.90875 8.90226 2.34735 8.90226V7.49818C3.90859 7.49818 4.80926 7.19251 5.42786 6.79397C6.07232 6.37865 6.47373 5.83323 7.03377 5.14358C7.58147 4.46911 8.24014 3.72078 9.34279 3.16224C10.4387 2.60722 11.9098 2.26929 14.052 2.26923V3.67331Z"
											fill="white"
										/>
									</svg>
								</div>
							{:else if model.logoUrl}
								<img
									alt={model.displayName}
									class="size-8 rounded-lg border border-gray-100 bg-gray-50 object-cover dark:border-gray-700 dark:bg-gray-100 sm:size-10"
									src={model.logoUrl}
								/>
							{:else}
								<div
									class="h-10 w-10 rounded-lg border border-gray-100 bg-gray-200 dark:border-gray-700 dark:bg-gray-700"
									aria-hidden="true"
								></div>
							{/if}
						</div>

						<!-- Content -->
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<h3
									class="truncate font-medium text-gray-900 dark:text-gray-200 max-sm:text-xs"
									class:font-bold={isActive}
									class:dark:text-white={isActive}
								>
									{model.displayName}
								</h3>
								{#if index === 0 && model.isRouter && !isActive}
									<span
										class="rounded border border-gray-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-500 dark:border-gray-700 dark:text-gray-400"
									>
										Default
									</span>
								{/if}
							</div>
							<p class="truncate pr-4 text-xs text-gray-500 dark:text-gray-400 sm:text-[13px]">
								{model.isRouter
									? "Routes your messages to the best model for your request."
									: model.description || "-"}
							</p>
						</div>

						<!-- Icons and badges -->
						<div class="flex flex-shrink-0 items-center gap-1.5">
							{#if $settings.toolsOverrides?.[model.id] ?? (model as { supportsTools?: boolean }).supportsTools}
								<div
									title="This model supports tool calling (functions)."
									class="rounded-md bg-purple-50 p-1.5 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
								>
									<LucideHammer class="size-3 sm:size-3.5" />
								</div>
							{/if}
							{#if $settings.multimodalOverrides?.[model.id] ?? model.multimodal}
								<div
									title="This model is multimodal and supports image inputs natively."
									class="rounded-md bg-blue-50 p-1.5 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
								>
									<LucideImage class="size-3 sm:size-3.5" />
								</div>
							{/if}
							<button
								type="button"
								title="Model settings"
								aria-label="Model settings for {model.displayName}"
								class="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
								onclick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									goto(`${base}/settings/${model.id}`);
								}}
							>
								<LucideSettings class="size-3 sm:size-3.5" />
							</button>
							{#if isActive}
								<span
									class="rounded-full bg-black px-2.5 py-1 text-xs font-bold text-white shadow-md dark:bg-white dark:text-black"
								>
									Active
								</span>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		</div>
	</div>
</div>
