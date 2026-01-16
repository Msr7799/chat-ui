<script lang="ts">
	import IconUpload from "~icons/carbon/upload";
	import IconDocument from "~icons/carbon/document";
	import IconWarning from "~icons/carbon/warning";
	import { base } from "$app/paths";

	interface Props {
		onsubmit: (config: unknown) => void;
		oncancel: () => void;
	}

	let { onsubmit, oncancel }: Props = $props();

	let jsonText = $state("");
	let error = $state<string | null>(null);
	let isUploading = $state(false);

	function handleTextInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		jsonText = target.value;
		error = null;
	}

	async function handleFileUpload(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		try {
			const text = await file.text();
			jsonText = text;
			error = null;
		} catch (err) {
			error = "Failed to read file";
		}
	}

	function validateAndSubmit() {
		if (!jsonText.trim()) {
			error = "Please provide JSON configuration";
			return;
		}

		try {
			const parsed = JSON.parse(jsonText);

			// Validate structure
			if (!parsed || typeof parsed !== "object" || !parsed.mcpServers) {
				error = 'Invalid format. Expected: { "mcpServers": {...} }';
				return;
			}

			// Validate each server
			for (const [name, config] of Object.entries(parsed.mcpServers)) {
				const serverConfig = config as Record<string, unknown>;
				if (!serverConfig.command || typeof serverConfig.command !== "string") {
					error = `Server "${name}": command is required`;
					return;
				}
				if (!Array.isArray(serverConfig.args)) {
					error = `Server "${name}": args must be an array`;
					return;
				}
			}

			error = null;
			onsubmit(parsed);
		} catch (err) {
			error = "Invalid JSON format";
		}
	}
</script>

<div class="space-y-4">
	<!-- File Upload -->
	<div>
		<label
			for="file-upload"
			class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
		>
			Upload JSON File
		</label>
		<label
			for="file-upload"
			class="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 transition-colors hover:border-blue-500 hover:bg-blue-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
		>
			<div class="text-center">
				<IconUpload class="mx-auto mb-2 size-8 text-gray-400" />
				<p class="text-sm text-gray-600 dark:text-gray-400">Click to upload or drag and drop</p>
				<p class="text-xs text-gray-500 dark:text-gray-500">mcp_config.json or similar</p>
			</div>
			<input
				id="file-upload"
				type="file"
				accept=".json"
				class="hidden"
				onchange={handleFileUpload}
			/>
		</label>
	</div>

	<!-- Or Divider -->
	<div class="relative">
		<div class="absolute inset-0 flex items-center">
			<div class="w-full border-t border-gray-300 dark:border-gray-600"></div>
		</div>
		<div class="relative flex justify-center text-sm">
			<span class="bg-white px-2 text-gray-500 dark:bg-gray-900 dark:text-gray-400">or</span>
		</div>
	</div>

	<!-- Paste JSON -->
	<div>
		<label for="json-text" class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
			Paste JSON Configuration
		</label>
		<textarea
			id="json-text"
			rows="12"
			value={jsonText}
			oninput={handleTextInput}
			placeholder={`{
  "mcpServers": {
    "time": {
      "command": "uvx",
      "args": ["mcp-server-time"]
    },
    "mongodb": {
      "command": "npx",
      "args": ["-y", "mongodb-mcp-server"],
      "env": {
        "MDB_MCP_CONNECTION_STRING": "mongodb://..."
      }
    }
  }
}`}
			class="w-full rounded-lg border border-gray-300 bg-white p-3 font-mono text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
		></textarea>
	</div>

	<!-- Warning -->
	<div
		class="rounded-lg border border-stone-200 bg-stone-50 p-3 text-stone-900 dark:border-yellow-900/40 dark:bg-yellow-900/20 dark:text-yellow-100"
	>
		<div class="flex items-start gap-3">
			<IconWarning class="mt-0.5 size-4 flex-none text-stone-600 dark:text-yellow-300" />
			<div class="text-sm leading-5">
				<p class="font-medium">Important Security Notice</p>
				<p class="mt-1 text-[13px] text-stone-800 dark:text-yellow-100/90">
					This will run commands on your server. Only import configurations from trusted sources.
					Malicious configurations can execute arbitrary code.
				</p>
			</div>
		</div>
	</div>

	<!-- Error message -->
	{#if error}
		<div
			class="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
		>
			<p class="text-sm text-red-800 dark:text-red-200">{error}</p>
		</div>
	{/if}

	<!-- Actions -->
	<div class="flex justify-end gap-2">
		<button
			type="button"
			onclick={oncancel}
			class="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
		>
			Cancel
		</button>
		<button
			type="button"
			onclick={validateAndSubmit}
			disabled={isUploading}
			class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
		>
			{isUploading ? "Importing..." : "Import Configuration"}
		</button>
	</div>
</div>
