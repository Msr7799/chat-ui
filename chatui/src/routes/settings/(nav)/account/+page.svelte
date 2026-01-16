<script lang="ts">
	import { page } from "$app/stores";
	import { base } from "$app/paths";
	import { goto } from "$app/navigation";
	import { invalidateAll } from "$app/navigation";
	import CarbonUser from "~icons/carbon/user";
	import CarbonTrashCan from "~icons/carbon/trash-can";
	import CarbonTime from "~icons/carbon/time";
	import CarbonLogin from "~icons/carbon/login";
	import CarbonLogout from "~icons/carbon/logout";
	import CarbonKey from "~icons/carbon/password";
	import CarbonView from "~icons/carbon/view";
	import CarbonViewOff from "~icons/carbon/view-off";
	import CarbonCopy from "~icons/carbon/copy";

	let { data } = $props();
	let user = $derived(data.user);

	let showDeleteConfirm = $state(false);
	let deleteConfirmText = $state("");
	let isDeleting = $state(false);

	// Token management
	let hfToken = $state("");
	let showToken = $state(false);
	let isSavingToken = $state(false);
	let tokenSaved = $state(false);

	// Initialize token when user data is available
	$effect(() => {
		const currentUser = data.user as (typeof data.user & { hfToken?: string }) | undefined;
		if (currentUser?.hfToken && !hfToken) {
			hfToken = currentUser.hfToken;
		}
	});

	function formatDate(date: Date | undefined) {
		if (!date) return "Never";
		return new Intl.DateTimeFormat("en-US", {
			dateStyle: "medium",
			timeStyle: "short",
		}).format(new Date(date));
	}

	function formatDuration(duration: number | undefined) {
		if (!duration) return "0 minutes";
		const minutes = Math.floor(duration / (1000 * 60));
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) {
			return `${days}d ${hours % 24}h ${minutes % 60}m`;
		} else if (hours > 0) {
			return `${hours}h ${minutes % 60}m`;
		} else {
			return `${minutes}m`;
		}
	}

	async function copyToken() {
		if (hfToken) {
			await navigator.clipboard.writeText(hfToken);
			// Show temporary feedback
			tokenSaved = true;
			setTimeout(() => (tokenSaved = false), 2000);
		}
	}

	async function saveToken() {
		isSavingToken = true;
		try {
			const response = await fetch(`${base}/settings/account/token`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ hfToken }),
			});

			if (response.ok) {
				tokenSaved = true;
				setTimeout(() => (tokenSaved = false), 3000);
			} else {
				throw new Error("Failed to save token");
			}
		} catch (error) {
			console.error("Error saving token:", error);
			alert("Failed to save token. Please try again.");
		} finally {
			isSavingToken = false;
		}
	}

	async function deleteAccount() {
		if (deleteConfirmText !== "DELETE ACCOUNT") return;

		isDeleting = true;
		try {
			// Call the logout endpoint to end session
			const response = await fetch(`${base}/logout`, {
				method: "POST",
			});

			if (response.ok) {
				// Account deleted successfully, redirect to home
				goto(`${base}/`);
			} else {
				throw new Error("Failed to logout");
			}
		} catch (error) {
			console.error("Error deleting account:", error);
			alert("Failed to delete account. Please try again.");
		} finally {
			isDeleting = false;
			showDeleteConfirm = false;
		}
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex items-center gap-3">
		<div class="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
			<CarbonUser class="text-xl text-blue-600 dark:text-blue-400" />
		</div>
		<div>
			<h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Account Settings</h1>
			<p class="text-sm text-gray-600 dark:text-gray-400">
				Manage your account information and preferences
			</p>
		</div>
	</div>

	<!-- Profile Information -->
	<div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
		<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Profile Information</h2>
		<div class="space-y-4">
			<!-- Avatar and Basic Info -->
			<div class="flex items-center gap-4">
				<div
					class="flex size-16 items-center justify-center rounded-full border-2 border-gray-200 bg-indigo-500 text-white dark:border-gray-700"
				>
					{#if user?.avatarUrl}
						<img
							src={user.avatarUrl}
							referrerpolicy="no-referrer"
							class="size-full rounded-full object-cover"
							alt={user.username || user.email}
							onerror={(e) => {
								const target = e.currentTarget as HTMLImageElement;
								target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || user.email || "U")}&background=6366f1&color=fff&size=128`;
							}}
						/>
					{:else}
						<span class="text-2xl font-semibold uppercase">
							{(user?.username || user?.email || "U")[0]}
						</span>
					{/if}
				</div>
				<div>
					<h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">
						{user?.username || "Unknown User"}
					</h3>
					{#if user?.email}
						<p class="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
					{/if}
					{#if user?.isAdmin}
						<span
							class="inline-block rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-200"
						>
							Administrator
						</span>
					{/if}
					{#if user?.isEarlyAccess}
						<span
							class="inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
						>
							Early Access
						</span>
					{/if}
				</div>
			</div>

			<!-- Account Details -->
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div>
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
					<div
						class="mt-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
					>
						{user?.username || "Not set"}
					</div>
				</div>
				<div>
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
					<div
						class="mt-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
					>
						{user?.email || "Not set"}
					</div>
				</div>
				<div>
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label class="block text-sm font-medium text-gray-700 dark:text-gray-300"
						>HuggingFace ID</label
					>
					<div
						class="mt-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
					>
						{user?.hfUserId || "Not connected"}
					</div>
				</div>
				<div>
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label class="block text-sm font-medium text-gray-700 dark:text-gray-300"
						>Account Created</label
					>
					<div
						class="mt-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
					>
						{formatDate(user?.createdAt)}
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- HuggingFace Token Section -->
	<div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
		<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
			<CarbonKey class="text-xl" />
			HuggingFace Token
		</h2>
		<div class="space-y-4">
			<div class="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
				<p class="text-sm text-blue-800 dark:text-blue-200">
					<strong>Optional:</strong> Add your personal HuggingFace token for better performance and private
					quota.
				</p>
				<p class="mt-2 text-xs text-blue-600 dark:text-blue-300">
					💡 If left empty, the system will use the default server token. Your personal token (if
					set) will override the system default for all your requests.
				</p>
			</div>

			<div class="space-y-3">
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<label class="block text-sm font-medium text-gray-700 dark:text-gray-300"
					>Personal Token</label
				>
				<div class="flex gap-2">
					<div class="relative flex-1">
						<input
							bind:value={hfToken}
							type={showToken ? "text" : "password"}
							placeholder="hf_..."
							class="w-full rounded-md border border-gray-300 px-3 py-2 pr-20 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
						/>
						<div class="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1">
							<button
								onclick={() => (showToken = !showToken)}
								class="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
								title={showToken ? "Hide token" : "Show token"}
							>
								{#if showToken}
									<CarbonViewOff class="text-sm" />
								{:else}
									<CarbonView class="text-sm" />
								{/if}
							</button>
							<button
								onclick={copyToken}
								disabled={!hfToken}
								class="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
								title="Copy token"
							>
								<CarbonCopy class="text-sm" />
							</button>
						</div>
					</div>
					<button
						onclick={saveToken}
						disabled={isSavingToken || !hfToken}
						class="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isSavingToken ? "Saving..." : "Save"}
					</button>
				</div>

				{#if tokenSaved}
					<p class="text-sm text-green-600 dark:text-green-400">✓ Token saved successfully!</p>
				{/if}

				<p class="text-xs text-gray-500 dark:text-gray-400">
					Your token is encrypted and stored securely. It will override the system token for all
					your requests.
				</p>
			</div>
		</div>
	</div>

	<!-- Session Information -->
	<div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
		<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
			<CarbonTime class="text-xl" />
			Session Information
		</h2>
		<div class="space-y-4">
			<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
				<div
					class="flex items-center gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700"
				>
					<CarbonLogin class="text-xl text-green-600 dark:text-green-400" />
					<div>
						<p class="text-sm font-medium text-gray-700 dark:text-gray-300">Last Login</p>
						<p class="text-sm text-gray-600 dark:text-gray-400">{formatDate(user?.lastLoginAt)}</p>
					</div>
				</div>
				<div
					class="flex items-center gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700"
				>
					<CarbonLogout class="text-xl text-red-600 dark:text-red-400" />
					<div>
						<p class="text-sm font-medium text-gray-700 dark:text-gray-300">Last Logout</p>
						<p class="text-sm text-gray-600 dark:text-gray-400">{formatDate(user?.lastLogoutAt)}</p>
					</div>
				</div>
				<div
					class="flex items-center gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700"
				>
					<CarbonTime class="text-xl text-blue-600 dark:text-blue-400" />
					<div>
						<p class="text-sm font-medium text-gray-700 dark:text-gray-300">Total Online Time</p>
						<p class="text-sm text-gray-600 dark:text-gray-400">
							{formatDuration(user?.onlineDuration)}
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Danger Zone -->
	<div
		class="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20"
	>
		<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-red-900 dark:text-red-100">
			<CarbonTrashCan class="text-xl" />
			Danger Zone
		</h2>
		<div class="space-y-4">
			<p class="text-sm text-red-700 dark:text-red-300">
				Once you delete your account, there is no going back. This will permanently delete your
				account, all conversations, generated images, and settings.
			</p>
			<button
				onclick={() => (showDeleteConfirm = true)}
				class="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
				disabled={isDeleting}
			>
				Delete Account
			</button>
		</div>
	</div>
</div>

{#if showDeleteConfirm}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={() => (showDeleteConfirm = false)}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900"
			onclick={(e) => e.stopPropagation()}
		>
			<h3 class="text-lg font-semibold text-red-600 dark:text-red-400">Confirm Account Deletion</h3>
			<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
				This action cannot be undone. All your data including conversations, images, and settings
				will be permanently deleted.
			</p>
			<p class="mt-4 text-sm font-medium text-gray-900 dark:text-gray-100">
				Type "DELETE ACCOUNT" to confirm:
			</p>
			<input
				bind:value={deleteConfirmText}
				type="text"
				placeholder="DELETE ACCOUNT"
				class="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
			/>
			<div class="mt-6 flex gap-3">
				<button
					onclick={() => (showDeleteConfirm = false)}
					class="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
					disabled={isDeleting}
				>
					Cancel
				</button>
				<button
					onclick={deleteAccount}
					disabled={deleteConfirmText !== "DELETE ACCOUNT" || isDeleting}
					class="flex-1 rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-800"
				>
					{isDeleting ? "Deleting..." : "Delete Account"}
				</button>
			</div>
		</div>
	</div>
{/if}
