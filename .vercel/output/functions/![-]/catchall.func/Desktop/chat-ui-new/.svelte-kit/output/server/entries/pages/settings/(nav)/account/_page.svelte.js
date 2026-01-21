import { s as sanitize_props, a as attributes, c as attr } from "../../../../../chunks/index2.js";
import { e as escape_html } from "../../../../../chunks/escaping.js";
import "@sveltejs/kit/internal";
import "../../../../../chunks/exports.js";
import "../../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../../chunks/state.svelte.js";
import { U as User } from "../../../../../chunks/user.js";
import { T as Trash_can } from "../../../../../chunks/trash-can.js";
import { h as html } from "../../../../../chunks/html.js";
import { C as Copy } from "../../../../../chunks/copy.js";
function Logout($$renderer, $$props) {
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
  )}>${html(`<path fill="currentColor" d="M6 30h12a2 2 0 0 0 2-2v-3h-2v3H6V4h12v3h2V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v24a2 2 0 0 0 2 2"/><path fill="currentColor" d="M20.586 20.586L24.172 17H10v-2h14.172l-3.586-3.586L22 10l6 6l-6 6z"/>`)}</svg>`);
}
function View($$renderer, $$props) {
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
  )}>${html(`<path fill="currentColor" d="M30.94 15.66A16.69 16.69 0 0 0 16 5A16.69 16.69 0 0 0 1.06 15.66a1 1 0 0 0 0 .68A16.69 16.69 0 0 0 16 27a16.69 16.69 0 0 0 14.94-10.66a1 1 0 0 0 0-.68M16 25c-5.3 0-10.9-3.93-12.93-9C5.1 10.93 10.7 7 16 7s10.9 3.93 12.93 9C26.9 21.07 21.3 25 16 25"/><path fill="currentColor" d="M16 10a6 6 0 1 0 6 6a6 6 0 0 0-6-6m0 10a4 4 0 1 1 4-4a4 4 0 0 1-4 4"/>`)}</svg>`);
}
function Time($$renderer, $$props) {
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
  )}>${html(`<path fill="currentColor" d="M16 30a14 14 0 1 1 14-14a14 14 0 0 1-14 14m0-26a12 12 0 1 0 12 12A12 12 0 0 0 16 4"/><path fill="currentColor" d="M20.59 22L15 16.41V7h2v8.58l5 5.01z"/>`)}</svg>`);
}
function Login($$renderer, $$props) {
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
  )}>${html(`<path fill="currentColor" d="M26 30H14a2 2 0 0 1-2-2v-3h2v3h12V4H14v3h-2V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v24a2 2 0 0 1-2 2"/><path fill="currentColor" d="M14.59 20.59L18.17 17H4v-2h14.17l-3.58-3.59L16 10l6 6l-6 6z"/>`)}</svg>`);
}
function Password($$renderer, $$props) {
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
  )}>${html(`<path fill="currentColor" d="M21 2a8.998 8.998 0 0 0-8.612 11.612L2 24v6h6l10.388-10.388A9 9 0 1 0 21 2m0 16a7 7 0 0 1-2.032-.302l-1.147-.348l-.847.847l-3.181 3.181L12.414 20L11 21.414l1.379 1.379l-1.586 1.586L9.414 23L8 24.414l1.379 1.379L7.172 28H4v-3.172l9.802-9.802l.848-.847l-.348-1.147A7 7 0 1 1 21 18"/><circle cx="22" cy="10" r="2" fill="currentColor"/>`)}</svg>`);
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    let user = data.user;
    let isDeleting = false;
    let hfToken = "";
    function formatDate(date) {
      if (!date) return "Never";
      return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
    }
    function formatDuration(duration) {
      if (!duration) return "0 minutes";
      const minutes = Math.floor(duration / (1e3 * 60));
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
    $$renderer2.push(`<div class="flex flex-col gap-6"><div class="flex items-center gap-3"><div class="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">`);
    User($$renderer2, { class: "text-xl text-blue-600 dark:text-blue-400" });
    $$renderer2.push(`<!----></div> <div><h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Account Settings</h1> <p class="text-sm text-gray-600 dark:text-gray-400">Manage your account information and preferences</p></div></div> <div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"><h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Profile Information</h2> <div class="space-y-4"><div class="flex items-center gap-4"><div class="flex size-16 items-center justify-center rounded-full border-2 border-gray-200 bg-indigo-500 text-white dark:border-gray-700">`);
    if (user?.avatarUrl) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<img${attr("src", user.avatarUrl)} referrerpolicy="no-referrer" class="size-full rounded-full object-cover"${attr("alt", user.username || user.email)} onerror="this.__e=event"/>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<span class="text-2xl font-semibold uppercase">${escape_html((user?.username || user?.email || "U")[0])}</span>`);
    }
    $$renderer2.push(`<!--]--></div> <div><h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">${escape_html(user?.username || "Unknown User")}</h3> `);
    if (user?.email) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<p class="text-sm text-gray-600 dark:text-gray-400">${escape_html(user.email)}</p>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (user?.isAdmin) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span class="inline-block rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-200">Administrator</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (user?.isEarlyAccess) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span class="inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">Early Access</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></div> <div class="grid grid-cols-1 gap-4 md:grid-cols-2"><div><label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label> <div class="mt-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100">${escape_html(user?.username || "Not set")}</div></div> <div><label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label> <div class="mt-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100">${escape_html(user?.email || "Not set")}</div></div> <div><label class="block text-sm font-medium text-gray-700 dark:text-gray-300">HuggingFace ID</label> <div class="mt-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100">${escape_html(user?.hfUserId || "Not connected")}</div></div> <div><label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Account Created</label> <div class="mt-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100">${escape_html(formatDate(user?.createdAt))}</div></div></div></div></div> <div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"><h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">`);
    Password($$renderer2, { class: "text-xl" });
    $$renderer2.push(`<!----> HuggingFace Token</h2> <div class="space-y-4"><div class="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20"><p class="text-sm text-blue-800 dark:text-blue-200"><strong>Optional:</strong> Add your personal HuggingFace token for better performance and private
					quota.</p> <p class="mt-2 text-xs text-blue-600 dark:text-blue-300">💡 If left empty, the system will use the default server token. Your personal token (if
					set) will override the system default for all your requests.</p></div> <div class="space-y-3"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Personal Token</label> <div class="flex gap-2"><div class="relative flex-1"><input${attr("value", hfToken)}${attr("type", "password")} placeholder="hf_..." class="w-full rounded-md border border-gray-300 px-3 py-2 pr-20 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"/> <div class="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1"><button class="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"${attr("title", "Show token")}>`);
    {
      $$renderer2.push("<!--[!-->");
      View($$renderer2, { class: "text-sm" });
    }
    $$renderer2.push(`<!--]--></button> <button${attr("disabled", !hfToken, true)} class="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300" title="Copy token">`);
    Copy($$renderer2, { class: "text-sm" });
    $$renderer2.push(`<!----></button></div></div> <button${attr("disabled", !hfToken, true)} class="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">${escape_html("Save")}</button></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <p class="text-xs text-gray-500 dark:text-gray-400">Your token is encrypted and stored securely. It will override the system token for all
					your requests.</p></div></div></div> <div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"><h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">`);
    Time($$renderer2, { class: "text-xl" });
    $$renderer2.push(`<!----> Session Information</h2> <div class="space-y-4"><div class="grid grid-cols-1 gap-4 md:grid-cols-3"><div class="flex items-center gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">`);
    Login($$renderer2, { class: "text-xl text-green-600 dark:text-green-400" });
    $$renderer2.push(`<!----> <div><p class="text-sm font-medium text-gray-700 dark:text-gray-300">Last Login</p> <p class="text-sm text-gray-600 dark:text-gray-400">${escape_html(formatDate(user?.lastLoginAt))}</p></div></div> <div class="flex items-center gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">`);
    Logout($$renderer2, { class: "text-xl text-red-600 dark:text-red-400" });
    $$renderer2.push(`<!----> <div><p class="text-sm font-medium text-gray-700 dark:text-gray-300">Last Logout</p> <p class="text-sm text-gray-600 dark:text-gray-400">${escape_html(formatDate(user?.lastLogoutAt))}</p></div></div> <div class="flex items-center gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">`);
    Time($$renderer2, { class: "text-xl text-blue-600 dark:text-blue-400" });
    $$renderer2.push(`<!----> <div><p class="text-sm font-medium text-gray-700 dark:text-gray-300">Total Online Time</p> <p class="text-sm text-gray-600 dark:text-gray-400">${escape_html(formatDuration(user?.onlineDuration))}</p></div></div></div></div></div> <div class="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20"><h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-red-900 dark:text-red-100">`);
    Trash_can($$renderer2, { class: "text-xl" });
    $$renderer2.push(`<!----> Danger Zone</h2> <div class="space-y-4"><p class="text-sm text-red-700 dark:text-red-300">Once you delete your account, there is no going back. This will permanently delete your
				account, all conversations, generated images, and settings.</p> <button class="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"${attr("disabled", isDeleting, true)}>Delete Account</button></div></div></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _page as default
};
