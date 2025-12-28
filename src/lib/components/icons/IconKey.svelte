<script lang="ts">
	interface Props {
		classNames?: string;
	}

	let { classNames = "" }: Props = $props();
</script>

<svg
	class={classNames}
	width="1em"
	height="1em"
	viewBox="0 0 24 24"
	xmlns="http://www.w3.org/2000/svg"
	fill="currentColor"
>
	<path
		d="M7.5 14a4.5 4.5 0 1 1 4.243-6.04l7.257.04v2l-2 2v2h-2v2h-2.586l-1.196-1.196A4.48 4.48 0 0 1 7.5 14Zm0-2a2.5 2.5 0 1 0-2.5-2.5A2.5 2.5 0 0 0 7.5 12Z"
	/>
</svg>
