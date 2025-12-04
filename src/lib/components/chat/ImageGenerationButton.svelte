<script lang="ts">
	import CarbonImage from "~icons/carbon/image";
	import ImageGenerationModal from "$lib/components/ImageGenerationModal.svelte";

	let isModalOpen = $state(false);

	function openModal() {
		isModalOpen = true;
	}

	function onImageGenerated(imageUrl: string) {
		// You can add additional logic here if needed
		console.log("Image generated:", imageUrl);
	}
</script>

<button
	type="button"
	class="btn size-7 rounded-full border bg-white text-black shadow transition-none hover:bg-gray-50 hover:shadow-inner dark:border-transparent dark:bg-gray-600/50 dark:text-white dark:hover:bg-gray-600"
	onclick={openModal}
	aria-label="Generate AI Image"
	title="Generate AI Image with FLUX"
>
	<CarbonImage class="text-base" />
</button>

<ImageGenerationModal bind:open={isModalOpen} {onImageGenerated} />
