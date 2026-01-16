<script lang="ts">
	import { usePublicConfig } from "$lib/utils/PublicConfig.svelte";

	const publicConfig = usePublicConfig();

	interface Props {
		classNames?: string;
	}

	let { classNames = "" }: Props = $props();
</script>

<!-- استخدام واحد للّوجو مع التحكم الكامل بالحجم/الألوان عبر classNames من الخارج -->
<img
	width="60"
	height="40"
	class={classNames}
	alt="{publicConfig.PUBLIC_APP_NAME} logo"
	src="/chatui-new/light/logo.svg"
/>
