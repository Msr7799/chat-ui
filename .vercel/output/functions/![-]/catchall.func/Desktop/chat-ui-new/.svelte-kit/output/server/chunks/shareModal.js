import { b as attr_class, c as attr, h as clsx, d as stringify, s as sanitize_props, a as attributes } from "./index2.js";
import { u as usePublicConfig } from "./PublicConfig.svelte.js";
import { h as html } from "./html.js";
import { g as goto } from "./client.js";
import { b as base } from "./server.js";
import "@sveltejs/kit/internal/server";
import { p as page } from "./index3.js";
import { d as derived, w as writable } from "./index.js";
import { p as public_env } from "./shared-server.js";
function Logo($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const publicConfig = usePublicConfig();
    let { classNames = "" } = $$props;
    $$renderer2.push(`<img width="60" height="40"${attr_class(clsx(classNames))}${attr("alt", `${stringify(publicConfig.PUBLIC_APP_NAME)} logo`)} src="/chatui-new/light/logo.svg"/>`);
  });
}
function IconNew($$renderer, $$props) {
  let { classNames = "" } = $$props;
  $$renderer.push(`<svg xmlns="http://www.w3.org/2000/svg"${attr_class(clsx(classNames))} width="1em" height="1em" fill="none" viewBox="0 0 16 16"><path d="M7.258 1.856c.333 0 .66.024.979.07-.558.319-.972.86-1.123 1.503A5.254 5.254 0 1 0 9.32 13.513l.275-.127c.334-.17.712-.229 1.08-.17l.158.031.01.003 1.343.36-.359-1.345a1.77 1.77 0 0 1 .137-1.247 5.23 5.23 0 0 0 .538-2.041 2.356 2.356 0 0 0 1.544-1 6.808 6.808 0 0 1-.676 3.742v.001c-.034.066-.031.116-.025.14l.36 1.345a1.572 1.572 0 0 1-1.823 1.945l-.1-.024-1.334-.357a.2.2 0 0 0-.14.018l-.012.005A6.825 6.825 0 1 1 7.259 1.856Zm4.837-1.36c.434 0 .785.352.785.786v1.905h1.9a.785.785 0 0 1 0 1.57h-1.9v1.9a.786.786 0 1 1-1.57 0v-1.9H9.404a.785.785 0 0 1 0-1.57h1.906V1.282c0-.434.352-.787.785-.787Z" fill="currentColor"></path></svg>`);
}
function Settings($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  $$renderer.push(`<svg${attributes(
    {
      viewBox: "0 0 32 32",
      width: "1.2em",
      height: "1.2em",
      ...$$sanitized_props
    },
    void 0,
    void 0,
    void 0,
    3
  )}>${html(`<path fill="currentColor" d="M27 16.76v-1.53l1.92-1.68A2 2 0 0 0 29.3 11l-2.36-4a2 2 0 0 0-1.73-1a2 2 0 0 0-.64.1l-2.43.82a11 11 0 0 0-1.31-.75l-.51-2.52a2 2 0 0 0-2-1.61h-4.68a2 2 0 0 0-2 1.61l-.51 2.52a11.5 11.5 0 0 0-1.32.75l-2.38-.86A2 2 0 0 0 6.79 6a2 2 0 0 0-1.73 1L2.7 11a2 2 0 0 0 .41 2.51L5 15.24v1.53l-1.89 1.68A2 2 0 0 0 2.7 21l2.36 4a2 2 0 0 0 1.73 1a2 2 0 0 0 .64-.1l2.43-.82a11 11 0 0 0 1.31.75l.51 2.52a2 2 0 0 0 2 1.61h4.72a2 2 0 0 0 2-1.61l.51-2.52a11.5 11.5 0 0 0 1.32-.75l2.42.82a2 2 0 0 0 .64.1a2 2 0 0 0 1.73-1l2.28-4a2 2 0 0 0-.41-2.51ZM25.21 24l-3.43-1.16a8.9 8.9 0 0 1-2.71 1.57L18.36 28h-4.72l-.71-3.55a9.4 9.4 0 0 1-2.7-1.57L6.79 24l-2.36-4l2.72-2.4a8.9 8.9 0 0 1 0-3.13L4.43 12l2.36-4l3.43 1.16a8.9 8.9 0 0 1 2.71-1.57L13.64 4h4.72l.71 3.55a9.4 9.4 0 0 1 2.7 1.57L25.21 8l2.36 4l-2.72 2.4a8.9 8.9 0 0 1 0 3.13L27.57 20Z"/><path fill="currentColor" d="M16 22a6 6 0 1 1 6-6a5.94 5.94 0 0 1-6 6m0-10a3.91 3.91 0 0 0-4 4a3.91 3.91 0 0 0 4 4a3.91 3.91 0 0 0 4-4a3.91 3.91 0 0 0-4-4"/>`)}</svg>`);
}
function IconMCP($$renderer, $$props) {
  let { classNames = "" } = $$props;
  $$renderer.push(`<svg xmlns="http://www.w3.org/2000/svg"${attr_class(clsx(classNames))} width="1em" height="1em" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="m3.5 11.75l8.172-8.171a2.828 2.828 0 1 1 4 4m0 0L9.5 13.75m6.172-6.171a2.828 2.828 0 0 1 4 4l-6.965 6.964a1 1 0 0 0 0 1.414L14 21.25"></path><path d="m17.5 9.75l-6.172 6.171a2.829 2.829 0 0 1-4-4L13.5 5.749"></path></g></svg>`);
}
function Edit($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  $$renderer.push(`<svg${attributes(
    {
      viewBox: "0 0 32 32",
      width: "1.2em",
      height: "1.2em",
      ...$$sanitized_props
    },
    void 0,
    void 0,
    void 0,
    3
  )}>${html(`<path fill="currentColor" d="M2 26h28v2H2zM25.4 9c.8-.8.8-2 0-2.8l-3.6-3.6c-.8-.8-2-.8-2.8 0l-15 15V24h6.4zm-5-5L24 7.6l-3 3L17.4 7zM6 22v-3.6l10-10l3.6 3.6l-10 10z"/>`)}</svg>`);
}
function requireAuthUser() {
  if (page.data.loginEnabled && !page.data.user) {
    const url = page.data.shared || page.url.pathname.startsWith(`${base}/models/`) ? `${base}/login?next=${encodeURIComponent(page.url.pathname + page.url.search)}` : `${base}/login`;
    goto(url, {});
    return true;
  }
  return false;
}
function toKeyPart(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
}
toKeyPart(public_env.PUBLIC_APP_ASSETS || public_env.PUBLIC_APP_NAME);
toKeyPart(typeof base === "string" ? base : "");
function loadSelectedIds() {
  return /* @__PURE__ */ new Set();
}
function loadDisabledBaseIds() {
  return /* @__PURE__ */ new Set();
}
const allMcpServers = writable([]);
const mcpServersLoaded = writable(false);
const selectedServerIds = writable(loadSelectedIds());
const enabledServers = derived(
  [allMcpServers, selectedServerIds],
  ([$all, $selected]) => $all.filter((s) => $selected.has(s.id))
);
const enabledServersCount = derived(enabledServers, ($enabled) => $enabled.length);
const allBaseServersEnabled = derived(
  [allMcpServers, selectedServerIds],
  ([$all, $selected]) => {
    const baseServers = $all.filter((s) => s.type === "base");
    return baseServers.length > 0 && baseServers.every((s) => $selected.has(s.id));
  }
);
function toggleServer(id) {
  selectedServerIds.update(($ids) => {
    const newSet = new Set($ids);
    if (newSet.has(id)) {
      newSet.delete(id);
      if (id.startsWith("base-")) {
        const disabled = loadDisabledBaseIds();
        disabled.add(id);
      }
    } else {
      newSet.add(id);
      if (id.startsWith("base-")) {
        const disabled = loadDisabledBaseIds();
        disabled.delete(id);
      }
    }
    return newSet;
  });
}
function updateServerStatus(id, status, errorMessage, tools, authRequired) {
  allMcpServers.update(
    ($servers) => $servers.map(
      (s) => s.id === id ? {
        ...s,
        status,
        errorMessage,
        tools,
        authRequired
      } : s
    )
  );
}
async function healthCheckServer(server) {
  try {
    updateServerStatus(server.id, "connecting");
    const response = await fetch(`${base}/api/mcp/health`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: server.url, headers: server.headers })
    });
    const result = await response.json();
    if (result.ready && result.tools) {
      updateServerStatus(server.id, "connected", void 0, result.tools, false);
      return { ready: true, tools: result.tools };
    } else {
      updateServerStatus(server.id, "error", result.error, void 0, Boolean(result.authRequired));
      return { ready: false, error: result.error };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    updateServerStatus(server.id, "error", errorMessage);
    return { ready: false, error: errorMessage };
  }
}
function createShareModalStore() {
  const { subscribe, set } = writable(false);
  return {
    subscribe,
    open: () => set(true),
    close: () => set(false)
  };
}
const shareModal = createShareModalStore();
export {
  Edit as E,
  IconNew as I,
  Logo as L,
  Settings as S,
  IconMCP as a,
  allMcpServers as b,
  shareModal as c,
  allBaseServersEnabled as d,
  enabledServersCount as e,
  enabledServers as f,
  healthCheckServer as h,
  mcpServersLoaded as m,
  requireAuthUser as r,
  selectedServerIds as s,
  toggleServer as t
};
