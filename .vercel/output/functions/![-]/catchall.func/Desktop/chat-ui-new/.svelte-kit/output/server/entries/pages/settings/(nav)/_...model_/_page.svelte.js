import { s as sanitize_props, a as attributes, f as store_get, u as unsubscribe_stores, c as attr, d as stringify, e as ensure_array_like } from "../../../../../chunks/index2.js";
import { p as page } from "../../../../../chunks/index3.js";
import { b as base } from "../../../../../chunks/server.js";
import "@sveltejs/kit/internal/server";
import { I as IconOmni } from "../../../../../chunks/IconOmni.js";
import { u as useSettingsStore } from "../../../../../chunks/settings2.js";
import { C as CopyToClipBoardBtn } from "../../../../../chunks/CopyToClipBoardBtn.js";
import { A as Arrow_up_right } from "../../../../../chunks/arrow-up-right.js";
import { C as Copy } from "../../../../../chunks/copy.js";
import { h as html } from "../../../../../chunks/html.js";
import "@sveltejs/kit/internal";
import "../../../../../chunks/exports.js";
import "../../../../../chunks/utils.js";
import "../../../../../chunks/state.svelte.js";
import { u as usePublicConfig } from "../../../../../chunks/PublicConfig.svelte.js";
import { S as Switch } from "../../../../../chunks/Switch.js";
import { PROVIDERS_HUB_ORGS } from "@huggingface/inference";
import { e as escape_html } from "../../../../../chunks/escaping.js";
function Chat($$renderer, $$props) {
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
  )}>${html(`<path fill="currentColor" d="M17.74 30L16 29l4-7h6a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9v2H6a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4h20a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4h-4.84Z"/><path fill="currentColor" d="M8 10h16v2H8zm0 6h10v2H8z"/>`)}</svg>`);
}
function Code($$renderer, $$props) {
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
  )}>${html(`<path fill="currentColor" d="m31 16l-7 7l-1.41-1.41L28.17 16l-5.58-5.59L24 9zM1 16l7-7l1.41 1.41L3.83 16l5.58 5.59L8 23zm11.42 9.484L17.64 6l1.932.517L14.352 26z"/>`)}</svg>`);
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    const publicConfig = usePublicConfig();
    const settings = useSettingsStore();
    function getToolsOverride() {
      return store_get($$store_subs ??= {}, "$settings", settings).toolsOverrides?.[page.params.model] ?? false;
    }
    function setToolsOverride(v) {
      settings.update((s) => ({
        ...s,
        toolsOverrides: { ...s.toolsOverrides, [page.params.model]: v }
      }));
    }
    function getMultimodalOverride() {
      return store_get($$store_subs ??= {}, "$settings", settings).multimodalOverrides?.[page.params.model] ?? false;
    }
    function setMultimodalOverride(v) {
      settings.update((s) => ({
        ...s,
        multimodalOverrides: { ...s.multimodalOverrides, [page.params.model]: v }
      }));
    }
    function getHidePromptExamples() {
      return store_get($$store_subs ??= {}, "$settings", settings).hidePromptExamples?.[page.params.model] ?? false;
    }
    function setHidePromptExamples(v) {
      settings.update((s) => ({
        ...s,
        hidePromptExamples: { ...s.hidePromptExamples, [page.params.model]: v }
      }));
    }
    function getCustomPrompt() {
      return store_get($$store_subs ??= {}, "$settings", settings).customPrompts?.[page.params.model] ?? "";
    }
    let hasCustomPreprompt = store_get($$store_subs ??= {}, "$settings", settings).customPrompts[page.params.model] !== page.data.models.find((el) => el.id === page.params.model)?.preprompt;
    let model = page.data.models.find((el) => el.id === page.params.model);
    let providerList = model?.providers ?? [];
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      var bind_get = getToolsOverride;
      var bind_set = setToolsOverride;
      var bind_get_1 = getMultimodalOverride;
      var bind_set_1 = setMultimodalOverride;
      $$renderer3.push(`<div class="flex flex-col items-start"><div class="mb-4 flex flex-col gap-0.5"><h2 class="text-base font-semibold md:text-lg">${escape_html(model.displayName)}</h2> `);
      if (model.description) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<p class="line-clamp-2 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">${escape_html(model.description)}</p>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--></div> <div class="mb-4 flex flex-wrap items-center gap-1.5"><button class="flex w-fit items-center rounded-full bg-black px-3 py-1.5 text-sm !text-white shadow-sm hover:bg-black/90 dark:bg-white/80 dark:!text-gray-900 dark:hover:bg-white/90" name="Activate model">`);
      Chat($$renderer3, { class: "mr-1.5 text-sm" });
      $$renderer3.push(`<!----> New chat</button> `);
      if (model.modelUrl) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<a${attr("href", model.modelUrl || "https://huggingface.co/" + model.name)} target="_blank" rel="noreferrer" class="inline-flex items-center rounded-full border border-gray-200 px-2.5 py-1 text-sm hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700/60">`);
        Arrow_up_right($$renderer3, { class: "mr-1.5 shrink-0 text-xs " });
        $$renderer3.push(`<!----> Model page</a>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> `);
      if (model.datasetName || model.datasetUrl) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<a${attr("href", model.datasetUrl || "https://huggingface.co/datasets/" + model.datasetName)} target="_blank" rel="noreferrer" class="inline-flex items-center rounded-full border border-gray-200 px-2.5 py-1 text-sm hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700/60">`);
        Arrow_up_right($$renderer3, { class: "mr-1.5 shrink-0 text-xs " });
        $$renderer3.push(`<!----> Dataset page</a>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> `);
      if (model.websiteUrl) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<a${attr("href", model.websiteUrl)} target="_blank" class="inline-flex items-center rounded-full border border-gray-200 px-2.5 py-1 text-sm hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700/60" rel="noreferrer">`);
        Arrow_up_right($$renderer3, { class: "mr-1.5 shrink-0 text-xs " });
        $$renderer3.push(`<!----> Model website</a>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> `);
      if (publicConfig.isHuggingChat) {
        $$renderer3.push("<!--[-->");
        if (!model?.isRouter) {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<a${attr("href", "https://huggingface.co/playground?modelId=" + model.name)} target="_blank" rel="noreferrer" class="inline-flex items-center rounded-full border border-gray-200 px-2.5 py-1 text-sm hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700/60">`);
          Code($$renderer3, { class: "mr-1.5 shrink-0 text-xs" });
          $$renderer3.push(`<!----> API Playground</a> <a${attr("href", "https://huggingface.co/" + model.name)} target="_blank" rel="noreferrer" class="inline-flex items-center rounded-full border border-gray-200 px-2.5 py-1 text-sm hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700/60">`);
          Arrow_up_right($$renderer3, { class: "mr-1.5 shrink-0 text-xs" });
          $$renderer3.push(`<!----> View model card</a>`);
        } else {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--> `);
        CopyToClipBoardBtn($$renderer3, {
          value: `${stringify(publicConfig.PUBLIC_ORIGIN || page.url.origin)}${stringify(base)}/models/${stringify(model.id)}`,
          classNames: "inline-flex items-center rounded-full border border-gray-200 px-2.5 py-1 text-sm hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700/60",
          children: ($$renderer4) => {
            $$renderer4.push(`<div class="flex items-center gap-1.5">`);
            Copy($$renderer4, { class: "shrink-0 text-xs" });
            $$renderer4.push(`<!---->Copy direct link</div>`);
          }
        });
        $$renderer3.push(`<!---->`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--></div> <div class="relative flex w-full flex-col gap-2">`);
      if (model?.isRouter) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<p class="mb-3 mt-2 rounded-lg bg-gray-100 px-3 py-2 text-sm dark:bg-white/5">`);
        IconOmni($$renderer3, { classNames: "-translate-y-px" });
        $$renderer3.push(`<!----> Omni routes your messages to the best underlying model
				depending on your request.</p>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> <div class="flex w-full flex-row content-between"><h3 class="mb-1 text-[15px] font-semibold text-gray-800 dark:text-gray-200">System Prompt</h3> `);
      if (hasCustomPreprompt) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<button class="ml-auto text-xs underline decoration-gray-300 hover:decoration-gray-700 dark:decoration-gray-700 dark:hover:decoration-gray-400">Reset</button>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--></div> <textarea aria-label="Custom system prompt" rows="8" class="w-full resize-none rounded-md border border-gray-200 bg-gray-50 p-2 text-[13px] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">`);
      const $$body = escape_html(getCustomPrompt());
      if ($$body) {
        $$renderer3.push(`${$$body}`);
      }
      $$renderer3.push(`</textarea> <div class="mt-3 rounded-xl border border-gray-200 bg-white px-3 shadow-sm dark:border-gray-700 dark:bg-gray-800"><div class="divide-y divide-gray-200 dark:divide-gray-700"><div class="flex items-start justify-between py-3"><div><div class="text-[13px] font-medium text-gray-800 dark:text-gray-200">Tool calling (functions)</div> <p class="text-[12px] text-gray-500 dark:text-gray-400">Enable tools and allow the model to call them in chat.</p></div> `);
      Switch($$renderer3, {
        name: "forceTools",
        get checked() {
          return bind_get();
        },
        set checked($$value) {
          bind_set($$value);
        }
      });
      $$renderer3.push(`<!----></div> <div class="flex items-start justify-between py-3"><div><div class="text-[13px] font-medium text-gray-800 dark:text-gray-200">Multimodal support (image inputs)</div> <p class="text-[12px] text-gray-500 dark:text-gray-400">Enable image uploads and send images to this model.</p></div> `);
      Switch($$renderer3, {
        name: "forceMultimodal",
        get checked() {
          return bind_get_1();
        },
        set checked($$value) {
          bind_set_1($$value);
        }
      });
      $$renderer3.push(`<!----></div> `);
      if (model?.isRouter) {
        $$renderer3.push("<!--[-->");
        var bind_get_2 = getHidePromptExamples;
        var bind_set_2 = setHidePromptExamples;
        $$renderer3.push(`<div class="flex items-start justify-between py-3"><div><div class="text-[13px] font-medium text-gray-800 dark:text-gray-200">Hide prompt examples</div> <p class="text-[12px] text-gray-500 dark:text-gray-400">Hide the prompt suggestions above the chat input.</p></div> `);
        Switch($$renderer3, {
          name: "hidePromptExamples",
          get checked() {
            return bind_get_2();
          },
          set checked($$value) {
            bind_set_2($$value);
          }
        });
        $$renderer3.push(`<!----></div>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--></div></div> `);
      if (model.providers?.length) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<div class="mt-3 flex flex-col gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-800"><div><div class="text-[13px] font-medium text-gray-800 dark:text-gray-200">Inference Providers</div> <p class="text-[12px] text-gray-500 dark:text-gray-400">Providers serving this model. You can enable/disable some providers from <a class="underline decoration-gray-400 hover:decoration-gray-700 dark:decoration-gray-500 dark:hover:decoration-gray-500" target="_blank" href="https://huggingface.co/settings/inference-providers/settings">your settings</a>.</p></div> <ul class="mb-0.5 flex flex-wrap gap-2"><!--[-->`);
        const each_array = ensure_array_like(providerList);
        for (let i = 0, $$length = each_array.length; i < $$length; i++) {
          let prov = each_array[i];
          const hubOrg = PROVIDERS_HUB_ORGS[prov.provider];
          $$renderer3.push(`<li><span class="flex items-center gap-1 rounded-md bg-gray-100 py-0.5 pl-1.5 pr-2 text-xs text-gray-700 dark:bg-gray-700/60 dark:text-gray-200">`);
          if (hubOrg) {
            $$renderer3.push("<!--[-->");
            $$renderer3.push(`<img${attr("src", `https://huggingface.co/api/avatars/${stringify(hubOrg)}`)}${attr("alt", `${stringify(prov.provider)} logo`)} class="size-2.5 flex-none rounded-sm" onerror="this.__e=event"/>`);
          } else {
            $$renderer3.push("<!--[!-->");
          }
          $$renderer3.push(`<!--]--> ${escape_html(prov.provider)}</span></li>`);
        }
        $$renderer3.push(`<!--]--></ul></div>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--></div></div>`);
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
