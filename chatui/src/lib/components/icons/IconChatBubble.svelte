<script lang="ts">
	interface Props {
		classNames?: string;
	}

	let { classNames = "" }: Props = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	class={classNames}
	width="1em"
	height="1em"
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
>
	<rect x="3" y="4" width="18" height="14" rx="3" ry="3" />
	<path d="M7 10h6" />
	<path d="M7 14h3" />
	<path d="M8 20l3-2h7" />
</svg>
