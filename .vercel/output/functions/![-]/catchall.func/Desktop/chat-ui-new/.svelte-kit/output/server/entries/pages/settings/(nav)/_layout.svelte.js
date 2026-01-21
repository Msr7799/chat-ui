import { s as sanitize_props, a as attributes, b as attr_class, c as attr, e as ensure_array_like, d as stringify, f as store_get, u as unsubscribe_stores } from "../../../../chunks/index2.js";
import { b as base } from "../../../../chunks/server.js";
import "@sveltejs/kit/internal/server";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "../../../../chunks/state.svelte.js";
import { p as page } from "../../../../chunks/index3.js";
import { u as useSettingsStore } from "../../../../chunks/settings2.js";
import { I as IconOmni } from "../../../../chunks/IconOmni.js";
import { C as Close } from "../../../../chunks/close.js";
import { h as html } from "../../../../chunks/html.js";
import { I as Image } from "../../../../chunks/image.js";
import { H as Hammer } from "../../../../chunks/hammer.js";
import { U as User } from "../../../../chunks/user.js";
import { e as escape_html } from "../../../../chunks/escaping.js";
function Text_long_paragraph($$renderer, $$props) {
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
  )}>${html(`<path fill="currentColor" d="M6 24h14v2H6zm0-6h20v2H6zm0-6h20v2H6zm0-6h20v2H6z"/>`)}</svg>`);
}
function Gear_fill($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  $$renderer.push(`<svg${attributes(
    {
      viewBox: "0 0 16 16",
      width: "1.2em",
      height: "1.2em",
      ...$$sanitized_props
    },
    void 0,
    void 0,
    void 0,
    3
  )}>${html(`<path fill="currentColor" d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872zM8 10.93a2.929 2.929 0 1 1 0-5.86a2.929 2.929 0 0 1 0 5.858z"/>`)}</svg>`);
}
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { data, children } = $$props;
    let showContent = false;
    const settings = useSettingsStore();
    let modelFilter = "";
    const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ");
    let queryTokens = normalize(modelFilter).trim().split(/\s+/).filter(Boolean);
    $$renderer2.push(`<div class="mx-auto grid h-full w-full max-w-[1400px] grid-cols-1 grid-rows-[auto,1fr] content-start gap-x-6 overflow-hidden p-4 text-gray-800 dark:text-gray-300 md:grid-cols-3 md:grid-rows-[auto,1fr] md:p-4"><div class="col-span-1 mb-3 flex items-center justify-between md:col-span-3 md:mb-4">`);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <h2 class="left-0 right-0 mx-auto w-fit text-center text-xl font-bold md:hidden">Settings</h2> <button class="btn rounded-lg" aria-label="Close settings">`);
    Close($$renderer2, {
      class: "text-xl text-gray-900 hover:text-black dark:text-gray-200 dark:hover:text-white"
    });
    $$renderer2.push(`<!----></button></div> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div${attr_class("scrollbar-custom col-span-1 flex flex-col overflow-y-auto whitespace-nowrap rounded-r-xl bg-gradient-to-l from-gray-50 to-10% dark:from-gray-700/40 max-md:-mx-4 max-md:h-full md:pr-6", void 0, { "max-md:hidden": showContent })}><h3 class="px-3 pb-1 pt-2 text-xs font-semibold tracking-wide text-gray-600 dark:text-gray-400 md:text-left">Models</h3> <div class="px-2 py-2"><input${attr("value", modelFilter)} type="search" placeholder="Search by name" aria-label="Search models by name or id" class="w-full rounded-full border border-gray-300 bg-white px-4 py-1 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500 dark:focus:ring-gray-700"/></div> <!--[-->`);
      const each_array = ensure_array_like(data.models.filter((el) => !el.unlisted).filter((el) => {
        const haystack = normalize(`${el.id} ${el.name ?? ""} ${el.displayName ?? ""}`);
        return queryTokens.every((q) => haystack.includes(q));
      }));
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let model = each_array[$$index];
        $$renderer2.push(`<button type="button"${attr_class(`group flex h-9 w-full flex-none items-center gap-1 rounded-lg px-3 text-[13px] text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/60 md:rounded-xl md:px-3 ${stringify(model.id === page.params.model ? "!bg-gray-100 !text-gray-800 dark:!bg-gray-700 dark:!text-gray-200" : "")}`)}${attr("data-model-id", model.id)}${attr("aria-label", `Configure ${stringify(model.displayName)}`)}><div class="mr-auto flex items-center gap-1 truncate"><span class="truncate">${escape_html(model.displayName)}</span> `);
        if (model.isRouter) {
          $$renderer2.push("<!--[-->");
          IconOmni($$renderer2, {});
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></div> `);
        if (store_get($$store_subs ??= {}, "$settings", settings).toolsOverrides?.[model.id] ?? model.supportsTools) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<span title="Tool calling supported" class="grid size-[21px] flex-none place-items-center rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-500" aria-label="Model supports tools" role="img">`);
          Hammer($$renderer2, { class: "size-3" });
          $$renderer2.push(`<!----></span>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> `);
        if (store_get($$store_subs ??= {}, "$settings", settings).multimodalOverrides?.[model.id] ?? model.multimodal) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<span title="Multimodal support (image inputs)" class="grid size-[21px] flex-none place-items-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-500" aria-label="Model is multimodal" role="img">`);
          Image($$renderer2, { class: "size-3" });
          $$renderer2.push(`<!----></span>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> `);
        if (store_get($$store_subs ??= {}, "$settings", settings).customPrompts?.[model.id]) {
          $$renderer2.push("<!--[-->");
          Text_long_paragraph($$renderer2, {
            class: "size-6 rounded-md border border-gray-300 p-1 text-gray-800 dark:border-gray-600 dark:text-gray-200"
          });
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> `);
        if (model.id === store_get($$store_subs ??= {}, "$settings", settings).activeModel) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="flex h-[21px] items-center rounded-md bg-black/90 px-2 text-[11px] font-semibold leading-none text-white dark:bg-white dark:text-black">Active</div>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></button>`);
      }
      $$renderer2.push(`<!--]--> <div class="mt-4 space-y-1"><h3 class="px-3 pb-1 pt-2 text-xs font-semibold tracking-wide text-gray-600 dark:text-gray-400 md:text-left">Settings</h3> <button type="button"${attr_class(`group flex h-9 w-full flex-none items-center gap-1 rounded-lg px-3 text-[13px] text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/60 md:rounded-xl md:px-3 ${stringify(page.url.pathname === `${base}/settings/account` ? "!bg-gray-100 !text-gray-800 dark:!bg-gray-700 dark:!text-gray-200" : "")}`)} aria-label="Account settings">`);
      User($$renderer2, { class: "mr-0.5 text-xs" });
      $$renderer2.push(`<!----> Account</button> <button type="button"${attr_class(`group flex h-9 w-full flex-none items-center gap-1 rounded-lg px-3 text-[13px] text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/60 md:rounded-xl md:px-3 ${stringify(page.url.pathname === `${base}/settings/application` ? "!bg-gray-100 !text-gray-800 dark:!bg-gray-700 dark:!text-gray-200" : "")}`)} aria-label="Configure application settings">`);
      Gear_fill($$renderer2, { class: "mr-0.5 text-xxs" });
      $$renderer2.push(`<!----> Application Settings</button></div> <div class="mt-auto px-3 py-3 text-xs font-semibold text-gray-400/80 dark:text-gray-500/80">Mohamed S. Alromaihi</div></div>`);
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _layout as default
};
