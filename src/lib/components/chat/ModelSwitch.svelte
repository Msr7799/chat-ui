<script lang="ts">
	import { invalidateAll } from "$app/navigation";
	import { page } from "$app/state";
	import { base } from "$app/paths";
	import type { Model } from "$lib/types/Model";

	import { untrack } from "svelte";

	interface Props {
		models: Model[];
		currentModel: Model;
	}

	let { models, currentModel }: Props = $props();

	// Use untrack during initialization to avoid "state referenced locally" warning
	// since we only want the initial value here, and updates are handled by the effect.
	let selectedModelId = $state(
		untrack(() =>
			models.map((m) => m.id).includes(currentModel.id) ? currentModel.id : models[0].id
		)
	);

	$effect(() => {
		if (models.map((m) => m.id).includes(currentModel.id)) {
			// Untrack assignment if needed, though usually assignment to a state is fine.
			// But the warning might come from reading dependencies inside the effect without tracking them?
			// Actually the warning is about 'local state' (let selectedModelId).
			// The warnings we saw were on the initialization lines.
			selectedModelId = currentModel.id;
		}
	});

	async function handleModelChange() {
		if (!page.params.id) return;

		try {
			const response = await fetch(`${base}/conversation/${page.params.id}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ model: selectedModelId }),
			});

			if (!response.ok) {
				throw new Error("Failed to update model");
			}

			await invalidateAll();
		} catch (error) {
			console.error(error);
		}
	}
</script>

<div
	class="mx-auto mt-0 flex w-fit flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-500/20 p-4 dark:border-gray-800"
>
	<span>
		This model is no longer available. Switch to a new one to continue this conversation:
	</span>
	<div class="flex items-center space-x-2">
		<select
			bind:value={selectedModelId}
			class="rounded-md bg-gray-100 px-2 py-1 dark:bg-gray-900 max-sm:max-w-32"
		>
			{#each models as model}
				<option value={model.id}>{model.name}</option>
			{/each}
		</select>
		<button
			onclick={handleModelChange}
			disabled={selectedModelId === currentModel.id}
			class="rounded-md bg-gray-100 px-2 py-1 dark:bg-gray-900"
		>
			Accept
		</button>
	</div>
</div>
