export type ThemePreference = "light" | "dark" | "stone" | "red" | "indigo" | "system";

type ThemeState = {
	preference: ThemePreference;
	isDark: boolean;
};

type ThemeSubscriber = (state: ThemeState) => void;

let currentPreference: ThemePreference = "system";
const subscribers = new Set<ThemeSubscriber>();

function notify(preference: ThemePreference, isDark: boolean) {
	for (const subscriber of subscribers) {
		subscriber({ preference, isDark });
	}
}

export function subscribeToTheme(subscriber: ThemeSubscriber) {
	subscribers.add(subscriber);

	if (typeof document !== "undefined") {
		const preference = getThemePreference();
		const isDark = document.documentElement.classList.contains("dark");
		subscriber({ preference, isDark });
	} else {
		subscriber({ preference: "system", isDark: false });
	}

	return () => {
		subscribers.delete(subscriber);
	};
}

function setMetaThemeColor(isDark: boolean) {
	const metaTheme = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
	if (!metaTheme) return;
	metaTheme.setAttribute("content", isDark ? "rgb(26, 36, 50)" : "rgb(249, 250, 251)");
}

function applyTheme(preference: ThemePreference, systemIsDark: boolean) {
	const html = document.querySelector("html") as HTMLElement;
	html.classList.remove("dark", "stone", "red", "indigo");

	let isDark = false;

	if (preference === "stone") {
		html.classList.add("dark", "stone");
		isDark = true;
	} else if (preference === "red") {
		html.classList.add("dark", "red");
		isDark = true;
	} else if (preference === "indigo") {
		html.classList.add("dark", "indigo");
		isDark = true;
	} else if (preference === "dark") {
		html.classList.add("dark");
		isDark = true;
	} else if (preference === "system") {
		if (systemIsDark) {
			html.classList.add("dark");
			isDark = true;
		}
	}
	// light is default (no classes)

	setMetaThemeColor(isDark);
	notify(currentPreference, isDark);
}

export function getThemePreference(): ThemePreference {
	const raw = typeof localStorage !== "undefined" ? localStorage.getItem("theme") : null;
	if (
		raw === "light" ||
		raw === "dark" ||
		raw === "stone" ||
		raw === "red" ||
		raw === "indigo" ||
		raw === "system"
	) {
		currentPreference = raw as ThemePreference;
		return raw as ThemePreference;
	}
	currentPreference = "system";
	return "system";
}

/**
 * Explicitly set the theme preference and apply it immediately.
 * - "light": force light
 * - "dark": force dark
 * - "ocean": force ocean (blue dark)
 * - "system": follow the OS preference
 */
export function setTheme(preference: ThemePreference) {
	try {
		localStorage.theme = preference;
	} catch (_err) {
		void 0; // ignore write errors
	}

	const mql = window.matchMedia("(prefers-color-scheme: dark)");
	currentPreference = preference;
	const resolve = () => applyTheme(preference, mql.matches);

	// Apply now
	resolve();

	// If following system, listen for changes; otherwise remove listener
	const listener = () => resolve();
	// Store on window to allow replacing listener later
	const key = "__theme_mql_listener" as const;
	const w = window as unknown as {
		[key: string]: ((this: MediaQueryList, ev: MediaQueryListEvent) => void) | undefined;
	};
	const existing = w[key];
	if (existing) {
		try {
			mql.removeEventListener("change", existing);
		} catch (_err) {
			// older Safari compatibility
			const legacy = (
				mql as unknown as {
					removeListener?: (l: (this: MediaQueryList, ev: MediaQueryListEvent) => void) => void;
				}
			).removeListener;
			legacy?.(existing);
		}
		w[key] = undefined;
	}
	if (preference === "system") {
		try {
			mql.addEventListener("change", listener);
		} catch (_err) {
			// older Safari compatibility
			const legacy = (
				mql as unknown as {
					addListener?: (l: (this: MediaQueryList, ev: MediaQueryListEvent) => void) => void;
				}
			).addListener;
			legacy?.(listener);
		}
		w[key] = listener;
	}
}

// Backward-compatible toggle used by the sidebar button
export function switchTheme() {
	// Cycle: light -> dark -> stone -> red -> indigo -> light
	const current = getThemePreference();
	let next: ThemePreference = "light";

	if (current === "light") next = "dark";
	else if (current === "dark") next = "stone";
	else if (current === "stone") next = "red";
	else if (current === "red") next = "indigo";
	else if (current === "indigo") next = "light";
	else next = "light"; // system -> light

	setTheme(next);
}
