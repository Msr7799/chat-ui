import { s as sanitize_props, a as attributes, c as attr, b as attr_class, e as ensure_array_like, d as stringify, u as unsubscribe_stores, f as store_get } from "../../../../../chunks/index2.js";
import { T as Trash_can } from "../../../../../chunks/trash-can.js";
import { A as Arrow_up_right } from "../../../../../chunks/arrow-up-right.js";
import { h as html } from "../../../../../chunks/html.js";
import { u as useSettingsStore } from "../../../../../chunks/settings2.js";
import { S as Switch } from "../../../../../chunks/Switch.js";
import "@sveltejs/kit/internal";
import "../../../../../chunks/exports.js";
import "../../../../../chunks/utils.js";
import { b as base } from "../../../../../chunks/server.js";
import "@sveltejs/kit/internal/server";
import "../../../../../chunks/state.svelte.js";
import { p as page } from "../../../../../chunks/index3.js";
import { u as usePublicConfig } from "../../../../../chunks/PublicConfig.svelte.js";
import { u as useAPIClient } from "../../../../../chunks/APIClient.js";
import { I as IconKey } from "../../../../../chunks/IconKey.js";
import { e as escape_html } from "../../../../../chunks/escaping.js";
function Logo_github($$renderer, $$props) {
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
  )}>${html(`<path fill="currentColor" fill-rule="evenodd" d="M16 2a14 14 0 0 0-4.43 27.28c.7.13 1-.3 1-.67v-2.38c-3.89.84-4.71-1.88-4.71-1.88a3.7 3.7 0 0 0-1.62-2.05c-1.27-.86.1-.85.1-.85a2.94 2.94 0 0 1 2.14 1.45a3 3 0 0 0 4.08 1.16a2.93 2.93 0 0 1 .88-1.87c-3.1-.36-6.37-1.56-6.37-6.92a5.4 5.4 0 0 1 1.44-3.76a5 5 0 0 1 .14-3.7s1.17-.38 3.85 1.43a13.3 13.3 0 0 1 7 0c2.67-1.81 3.84-1.43 3.84-1.43a5 5 0 0 1 .14 3.7a5.4 5.4 0 0 1 1.44 3.76c0 5.38-3.27 6.56-6.39 6.91a3.33 3.33 0 0 1 .95 2.59v3.84c0 .46.25.81 1 .67A14 14 0 0 0 16 2"/>`)}</svg>`);
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    const publicConfig = usePublicConfig();
    let settings = useSettingsStore();
    function getShareWithAuthors() {
      return store_get($$store_subs ??= {}, "$settings", settings).shareConversationsWithModelAuthors;
    }
    function setShareWithAuthors(v) {
      settings.update((s) => ({ ...s, shareConversationsWithModelAuthors: v }));
    }
    function getDisableStream() {
      return store_get($$store_subs ??= {}, "$settings", settings).disableStream;
    }
    function setDisableStream(v) {
      settings.update((s) => ({ ...s, disableStream: v }));
    }
    function getDirectPaste() {
      return store_get($$store_subs ??= {}, "$settings", settings).directPaste;
    }
    function setDirectPaste(v) {
      settings.update((s) => ({ ...s, directPaste: v }));
    }
    useAPIClient();
    let billingOrgs = [];
    function getBillingOrganization() {
      return store_get($$store_subs ??= {}, "$settings", settings).billingOrganization ?? "";
    }
    function setBillingOrganization(v) {
      settings.update((s) => ({ ...s, billingOrganization: v }));
    }
    let refreshing = false;
    let geminiApiKeyInput = "";
    let hfTokenInput = "";
    let isSavingKeys = false;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      var bind_get_1 = getDisableStream;
      var bind_set_1 = setDisableStream;
      var bind_get_2 = getDirectPaste;
      var bind_set_2 = setDirectPaste;
      $$renderer3.push(`<div class="flex w-full flex-col gap-4"><h2 class="text-center text-lg font-semibold text-gray-800 dark:text-gray-200 md:text-left">Application Settings</h2> `);
      {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> `);
      if (!!publicConfig.PUBLIC_COMMIT_SHA) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<div class="flex flex-col items-start justify-between text-xl font-semibold text-gray-800 dark:text-gray-200"><a${attr("href", `https://github.com/huggingface/chat-ui/commit/${publicConfig.PUBLIC_COMMIT_SHA}`)} target="_blank" rel="noreferrer" class="text-sm font-light text-gray-500 dark:text-gray-400">Latest deployment <span class="gap-2 font-mono">${escape_html(publicConfig.PUBLIC_COMMIT_SHA.slice(0, 7))}</span></a></div>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> `);
      if (page.data.isAdmin) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<div class="flex items-center gap-2"><p class="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">Admin mode</p> <button${attr_class("btn rounded-md text-xs", void 0, { "underline": !refreshing })} type="button"${attr("disabled", refreshing, true)}>${escape_html("Refresh models")}</button> `);
        {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--></div>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> <div class="flex h-full flex-col gap-4 max-sm:pt-0">`);
      if (page.data.isAdmin) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<div class="rounded-xl border border-gray-200 bg-white px-3 shadow-sm dark:border-gray-700 dark:bg-gray-800"><div class="divide-y divide-gray-200 dark:divide-gray-700"><div class="flex items-start justify-between py-3"><div><div class="flex items-center gap-2 text-[13px] font-medium text-gray-800 dark:text-gray-200">`);
        IconKey($$renderer3, { classNames: "text-base" });
        $$renderer3.push(`<!----> Google AI Studio API Key</div> <p class="text-[12px] text-gray-500 dark:text-gray-400">Used for Google chat models + Google Images + Google Videos.</p> <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" class="mt-1 inline-flex items-center text-[12px] underline decoration-gray-300 underline-offset-2 hover:decoration-gray-700 dark:decoration-gray-700 dark:hover:decoration-gray-400">Create / Manage Google Studio API Key</a></div> <div class="flex w-[420px] max-w-full flex-col gap-2"><div class="flex items-center gap-2"><input${attr("value", geminiApiKeyInput)}${attr("type", "password")}${attr("placeholder", "AIza...")} class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"${attr("disabled", true, true)}/> <button type="button" class="btn rounded-md text-xs"${attr("disabled", isSavingKeys, true)}>${escape_html("Show")}</button></div> <div class="flex items-center justify-end gap-2"><button type="button" class="btn rounded-md text-xs"${attr("disabled", true, true)}>Save</button> <button type="button" class="btn rounded-md text-xs"${attr("disabled", true, true)}>Clear</button></div></div></div> <div class="flex items-start justify-between py-3"><div><div class="flex items-center gap-2 text-[13px] font-medium text-gray-800 dark:text-gray-200">`);
        IconKey($$renderer3, { classNames: "text-base" });
        $$renderer3.push(`<!----> Hugging Face Token (HF_TOKEN)</div> <p class="text-[12px] text-gray-500 dark:text-gray-400">Used for Hugging Face Router / OpenAI-compatible endpoints.</p> <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer" class="mt-1 inline-flex items-center text-[12px] underline decoration-gray-300 underline-offset-2 hover:decoration-gray-700 dark:decoration-gray-700 dark:hover:decoration-gray-400">Create / Manage Hugging Face Token</a></div> <div class="flex w-[420px] max-w-full flex-col gap-2"><div class="flex items-center gap-2"><input${attr("value", hfTokenInput)}${attr("type", "password")}${attr("placeholder", "hf_...")} class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"${attr("disabled", true, true)}/> <button type="button" class="btn rounded-md text-xs"${attr("disabled", isSavingKeys, true)}>${escape_html("Show")}</button></div> <div class="flex items-center justify-end gap-2"><button type="button" class="btn rounded-md text-xs"${attr("disabled", true, true)}>Save</button> <button type="button" class="btn rounded-md text-xs"${attr("disabled", true, true)}>Clear</button></div></div></div></div> `);
        {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--> `);
        {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--> `);
        {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--></div>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> <div class="rounded-xl border border-gray-200 bg-white px-3 shadow-sm dark:border-gray-700 dark:bg-gray-800"><div class="divide-y divide-gray-200 dark:divide-gray-700">`);
      if (publicConfig.PUBLIC_APP_DATA_SHARING === "1") {
        $$renderer3.push("<!--[-->");
        var bind_get = getShareWithAuthors;
        var bind_set = setShareWithAuthors;
        $$renderer3.push(`<div class="flex items-start justify-between py-3"><div><div class="text-[13px] font-medium text-gray-800 dark:text-gray-200">Share with model authors</div> <p class="text-[12px] text-gray-500 dark:text-gray-400">Sharing your data helps improve open models over time.</p></div> `);
        Switch($$renderer3, {
          name: "shareConversationsWithModelAuthors",
          get checked() {
            return bind_get();
          },
          set checked($$value) {
            bind_set($$value);
          }
        });
        $$renderer3.push(`<!----></div>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> <div class="flex items-start justify-between py-3"><div><div class="text-[13px] font-medium text-gray-800 dark:text-gray-200">Disable streaming tokens</div> <p class="text-[12px] text-gray-500 dark:text-gray-400">Show responses only when complete.</p></div> `);
      Switch($$renderer3, {
        name: "disableStream",
        get checked() {
          return bind_get_1();
        },
        set checked($$value) {
          bind_set_1($$value);
        }
      });
      $$renderer3.push(`<!----></div> <div class="flex items-start justify-between py-3"><div><div class="text-[13px] font-medium text-gray-800 dark:text-gray-200">Paste text directly</div> <p class="text-[12px] text-gray-500 dark:text-gray-400">Paste long text directly into chat instead of a file.</p></div> `);
      Switch($$renderer3, {
        name: "directPaste",
        get checked() {
          return bind_get_2();
        },
        set checked($$value) {
          bind_set_2($$value);
        }
      });
      $$renderer3.push(`<!----></div> <div class="flex items-start justify-between py-3"><div><div class="text-[13px] font-medium text-gray-800 dark:text-gray-200">Theme</div> <p class="text-[12px] text-gray-500 dark:text-gray-400">Choose light, dark, or follow system.</p></div> <div class="flex overflow-hidden rounded-md border text-center dark:divide-gray-600 dark:border-gray-600 max-sm:flex-col max-sm:divide-y sm:items-center sm:divide-x"><button${attr_class("inline-flex items-center justify-center px-2.5 py-1 text-center text-xs bg-black text-white dark:border-white/10 dark:bg-white/80 dark:text-gray-900")}>system</button> <button${attr_class("inline-flex items-center justify-center px-2.5 py-1 text-center text-xs hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/60")}>light</button> <button${attr_class("inline-flex items-center justify-center px-2.5 py-1 text-center text-xs hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/60")}>dark</button></div></div></div></div> `);
      if (publicConfig.isHuggingChat && page.data.user) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<div class="rounded-xl border border-gray-200 bg-white px-3 shadow-sm dark:border-gray-700 dark:bg-gray-800"><div class="divide-y divide-gray-200 dark:divide-gray-700"><div class="flex items-start justify-between py-3"><div><div class="text-[13px] font-medium text-gray-800 dark:text-gray-200">Billing</div> <p class="text-[12px] text-gray-500 dark:text-gray-400">Select between personal or organization billing (for eligible organizations).</p></div> <div class="flex items-center">`);
        {
          $$renderer3.push("<!--[!-->");
          {
            $$renderer3.push("<!--[!-->");
            $$renderer3.select(
              {
                class: "rounded-md border border-gray-300 bg-white px-1 py-1 text-xs text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200",
                value: getBillingOrganization(),
                onchange: (e) => setBillingOrganization(e.currentTarget.value)
              },
              ($$renderer4) => {
                $$renderer4.option({ value: "" }, ($$renderer5) => {
                  $$renderer5.push(`Personal`);
                });
                $$renderer4.push(`<!--[-->`);
                const each_array = ensure_array_like(billingOrgs);
                for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                  let org = each_array[$$index];
                  $$renderer4.option({ value: org.preferred_username }, ($$renderer5) => {
                    $$renderer5.push(`${escape_html(org.name)}`);
                  });
                }
                $$renderer4.push(`<!--]-->`);
              }
            );
          }
          $$renderer3.push(`<!--]-->`);
        }
        $$renderer3.push(`<!--]--></div></div> <div class="flex items-start justify-between py-3"><div><div class="text-[13px] font-medium text-gray-800 dark:text-gray-200">Providers Usage</div> <p class="text-[12px] text-gray-500 dark:text-gray-400">See which providers you use and choose your preferred ones.</p></div> <a${attr("href", getBillingOrganization() ? `https://huggingface.co/organizations/${getBillingOrganization()}/settings/inference-providers/overview` : "https://huggingface.co/settings/inference-providers/overview")} target="_blank" class="whitespace-nowrap rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">View Usage</a></div></div></div>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> <div class="mt-6 flex flex-col gap-2 self-start text-[13px]">`);
      if (publicConfig.isHuggingChat) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<a href="https://github.com/huggingface/chat-ui" target="_blank" class="flex items-center underline decoration-gray-300 underline-offset-2 hover:decoration-gray-700 dark:decoration-gray-700 dark:hover:decoration-gray-400">`);
        Logo_github($$renderer3, { class: "mr-1.5 shrink-0 text-sm " });
        $$renderer3.push(`<!----> Github repository</a> <a href="https://huggingface.co/spaces/huggingchat/chat-ui/discussions/764" target="_blank" rel="noreferrer" class="flex items-center underline decoration-gray-300 underline-offset-2 hover:decoration-gray-700 dark:decoration-gray-700 dark:hover:decoration-gray-400">`);
        Arrow_up_right($$renderer3, { class: "mr-1.5 shrink-0 text-sm " });
        $$renderer3.push(`<!----> Share your feedback on HuggingChat</a> <a${attr("href", `${stringify(base)}/privacy`)} class="flex items-center underline decoration-gray-300 underline-offset-2 hover:decoration-gray-700 dark:decoration-gray-700 dark:hover:decoration-gray-400">`);
        Arrow_up_right($$renderer3, { class: "mr-1.5 shrink-0 text-sm " });
        $$renderer3.push(`<!----> About &amp; Privacy</a>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> <button type="submit" class="flex items-center underline decoration-red-200 underline-offset-2 hover:decoration-red-500 dark:decoration-red-900 dark:hover:decoration-red-700">`);
      Trash_can($$renderer3, { class: "mr-2 inline text-sm text-red-500" });
      $$renderer3.push(`<!---->Delete all conversations</button> <div class="relative bottom-0 mt-24 text-lg font-semibold text-gray-400/80 dark:text-gray-500/80">Rights reserved © 2026
				develope by Mohamed S. Alromaihi</div></div></div></div>`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
