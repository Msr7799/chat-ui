# MarkdownBlock.svelte

```svelte
<script lang="ts">
	import type { Token } from "$lib/utils/marked";
	import CodeBlock from "../CodeBlock.svelte";

	interface Props {
		tokens: Token[];
		loading?: boolean;
		onEditCode?: (payload: { originalFenced: string; nextFenced: string }) => void;
	}

	let { tokens, loading = false, onEditCode }: Props = $props();

	// Derive rendered tokens for memoization
	const renderedTokens = $derived(tokens);
</script>

{#each renderedTokens as token}
	{#if token.type === "text"}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html token.html}
	{:else if token.type === "code"}
		<CodeBlock
			code={token.code}
			rawCode={token.rawCode}
			fencedRaw={token.raw}
			loading={loading && !token.isClosed}
			onapply={(payload) => onEditCode?.(payload)}
		/>
	{/if}
{/each}
```