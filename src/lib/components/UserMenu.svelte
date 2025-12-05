<script lang="ts">
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { goto } from "$app/navigation";
	import IconUser from "./icons/IconUser.svelte";
	import type { LayoutData } from "../../routes/$types";

	interface Props {
		user: LayoutData["user"];
	}

	let { user }: Props = $props();

	let isMenuOpen = $state(false);

	function toggleMenu() {
		isMenuOpen = !isMenuOpen;
	}

	function closeMenu() {
		isMenuOpen = false;
	}

	function handleLogin() {
		const currentPath = page.url.pathname + page.url.search;
		window.location.href = resolve("/login") + `?next=${encodeURIComponent(currentPath)}`;
	}

	async function handleLogout() {
		console.log("🔴 Logout button clicked!");
		try {
			const logoutUrl = resolve("/api/v2/logout");
			console.log("🔴 Sending logout request to:", logoutUrl);
			const response = await fetch(logoutUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});
			
			console.log("🔴 Logout response status:", response.status);
			console.log("🔴 Logout response ok:", response.ok);
			
			if (response.ok) {
				const result = await response.json();
				console.log("🔴 Logout result:", result);
				// Successful logout
				window.location.href = resolve("/");
			} else {
				const errorText = await response.text();
				console.error("🔴 Logout failed:", errorText);
			}
		} catch (error) {
			console.error("🔴 Logout failed:", error);
		}
	}

	// Close menu when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest(".user-menu-container")) {
			closeMenu();
		}
	}

	$effect(() => {
		if (isMenuOpen) {
			document.addEventListener("click", handleClickOutside);
			return () => {
				document.removeEventListener("click", handleClickOutside);
			};
		}
	});
</script>

<div class="user-menu-container relative">
	{#if user?.username || user?.email}
		<!-- User Avatar Button -->
		<button
			onclick={toggleMenu}
			class="flex size-9 items-center justify-center rounded-full border-2 border-gray-300 bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-md transition-all duration-200 hover:scale-105 hover:shadow-lg dark:border-gray-600"
			aria-label="User menu"
			title={user.username || user.email}
		>
			<img
				src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || user.email || 'U')}&background=6366f1&color=fff&size=128`}
				class="size-full rounded-full object-cover"
				alt={user.username || user.email}
			/>
		</button>
	{:else}
		<!-- Login Button -->
		<button
			onclick={handleLogin}
			class="flex size-9 items-center justify-center rounded-full border-2 border-gray-300 bg-gray-100 text-gray-600 shadow-md transition-all duration-200 hover:scale-105 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 hover:shadow-lg dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:border-blue-400 dark:hover:bg-gray-600 dark:hover:text-blue-400"
			aria-label="Sign in"
			title="Sign in with Google"
		>
			<IconUser />
		</button>
	{/if}

	<!-- Dropdown Menu -->
	{#if isMenuOpen && (user?.username || user?.email)}
		<div
			class="absolute right-0 top-12 z-50 w-64 rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
		>
			<!-- User Info Section -->
			<div class="border-b border-gray-200 p-4 dark:border-gray-700">
				<div class="flex items-center gap-3">
					<img
						src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || user.email || 'U')}&background=6366f1&color=fff&size=128`}
						class="size-12 rounded-full object-cover"
						alt={user.username || user.email}
					/>
					<div class="flex-1 overflow-hidden">
						{#if user.username}
							<p class="truncate font-medium text-gray-900 dark:text-gray-100">
								{user.username}
							</p>
						{/if}
						{#if user.email}
							<p class="truncate text-sm text-gray-500 dark:text-gray-400">
								{user.email}
							</p>
						{/if}
					</div>
				</div>
			</div>

			<!-- Menu Items -->
			<div class="p-2">
				<a
					href={resolve("/settings/application")}
					onclick={closeMenu}
					class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
				>
					<svg
						class="size-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
						></path>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
						></path>
					</svg>
					Settings
				</a>

				<a
					href={resolve("/gallery")}
					onclick={closeMenu}
					class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
				>
					<svg
						class="size-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
						></path>
					</svg>
					Gallery
				</a>

				<button
					onclick={handleLogout}
					class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
				>
					<svg
						class="size-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
						></path>
					</svg>
					Sign Out
				</button>
			</div>
		</div>
	{/if}
</div>
