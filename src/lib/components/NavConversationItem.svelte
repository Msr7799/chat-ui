<script lang="ts">
	import { base } from "$app/paths";
	import { page } from "$app/state";

	import CarbonTrashCan from "~icons/carbon/trash-can";
	import CarbonEdit from "~icons/carbon/edit";
	import CarbonCheckmark from "~icons/carbon/checkmark";
	import type { ConvSidebar } from "$lib/types/ConvSidebar";

	import EditConversationModal from "$lib/components/EditConversationModal.svelte";
	import DeleteConversationModal from "$lib/components/DeleteConversationModal.svelte";
	import { requireAuthUser } from "$lib/utils/auth";

	interface Props {
		conv: ConvSidebar;
		readOnly?: true;
		ondeleteConversation?: (id: string) => void;
		oneditConversationTitle?: (payload: { id: string; title: string }) => void;
		isSelectionMode?: boolean;
		isSelected?: boolean;
		onToggleSelection?: () => void;
	}

	let {
		conv,
		readOnly,
		ondeleteConversation,
		oneditConversationTitle,
		isSelectionMode = false,
		isSelected = false,
		onToggleSelection,
	}: Props = $props();

	let deleteOpen = $state(false);
	let renameOpen = $state(false);
</script>

{#if isSelectionMode}
	<button
		type="button"
		onclick={(e) => {
			e.preventDefault();
			onToggleSelection?.();
		}}
		class="group flex h-[2.15rem] w-full flex-none items-center gap-1.5 rounded-lg pl-2.5 pr-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 max-sm:h-10
			{isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}"
	>
		<div
			class="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2 transition-colors
				{isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300 dark:border-gray-600'}"
		>
			{#if isSelected}
				<CarbonCheckmark class="text-xs text-white" />
			{/if}
		</div>
		<div class="my-2 min-w-0 flex-1 truncate text-left first-letter:uppercase">
			<span>{conv.title}</span>
		</div>
	</button>
{:else}
	<a
		data-sveltekit-noscroll
		data-sveltekit-preload-data="tap"
		href="{base}/conversation/{conv.id}"
		class="group flex h-[2.15rem] flex-none items-center gap-1.5 rounded-lg pl-2.5 pr-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 max-sm:h-10
			{conv.id === page.params.id ? 'bg-gray-100 dark:bg-gray-700' : ''}"
	>
		<div class="my-2 min-w-0 flex-1 truncate first-letter:uppercase">
			<span>{conv.title}</span>
		</div>

		{#if !readOnly}
			<button
				type="button"
				class="flex h-5 w-5 items-center justify-center rounded md:hidden md:group-hover:flex"
				title="Edit conversation title"
				onclick={(e) => {
					e.preventDefault();
					if (requireAuthUser()) return;
					renameOpen = true;
				}}
			>
				<CarbonEdit class="text-xs text-gray-400 hover:text-gray-500 dark:hover:text-gray-300" />
			</button>

			<button
				type="button"
				class="flex h-5 w-5 items-center justify-center rounded md:hidden md:group-hover:flex"
				title="Delete conversation"
				onclick={(event) => {
					event.preventDefault();
					if (requireAuthUser()) return;
					if (event.shiftKey) {
						ondeleteConversation?.(conv.id.toString());
					} else {
						deleteOpen = true;
					}
				}}
			>
				<CarbonTrashCan
					class="text-xs text-gray-400  hover:text-gray-500 dark:hover:text-gray-300"
				/>
			</button>
		{/if}
	</a>
{/if}

<!-- Edit title modal -->
{#if renameOpen}
	<EditConversationModal
		open={renameOpen}
		title={conv.title}
		onclose={() => (renameOpen = false)}
		onsave={(payload) => {
			renameOpen = false;
			oneditConversationTitle?.({ id: conv.id.toString(), title: payload.title });
		}}
	/>
{/if}

<!-- Delete confirmation modal -->
{#if deleteOpen}
	<DeleteConversationModal
		open={deleteOpen}
		title={conv.title}
		onclose={() => (deleteOpen = false)}
		ondelete={() => {
			deleteOpen = false;
			ondeleteConversation?.(conv.id.toString());
		}}
	/>
{/if}
