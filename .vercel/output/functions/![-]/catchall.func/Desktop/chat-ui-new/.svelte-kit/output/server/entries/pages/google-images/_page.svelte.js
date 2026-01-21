import { c as attr, e as ensure_array_like, f as store_get, u as unsubscribe_stores } from "../../../chunks/index2.js";
import "@sveltejs/kit/internal/server";
import { p as page } from "../../../chunks/stores.js";
import { u as useAPIClient } from "../../../chunks/APIClient.js";
import { I as IconLoading, U as Upload } from "../../../chunks/IconLoading.js";
import { I as IconGoogleVideo } from "../../../chunks/IconGoogleVideo.js";
import { I as IconPrompt } from "../../../chunks/IconPrompt.js";
import { I as IconKey } from "../../../chunks/IconKey.js";
import { C as Copy } from "../../../chunks/copy.js";
import { T as Trash_can } from "../../../chunks/trash-can.js";
import { C as Chevron_right } from "../../../chunks/chevron-right.js";
import { e as escape_html } from "../../../chunks/escaping.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    useAPIClient();
    const starterImages = [
      { url: "/google_studio_page/1.png", prompt: "Starter image 1" },
      { url: "/google_studio_page/2.webp", prompt: "Starter image 2" },
      { url: "/google_studio_page/3.webp", prompt: "Starter image 3" },
      { url: "/google_studio_page/4.webp", prompt: "Starter image 4" },
      { url: "/google_studio_page/5.png", prompt: "Starter image 5" },
      { url: "/google_studio_page/6.webp", prompt: "Starter image 6" }
    ];
    let isLoadingModels = false;
    let prompt = "";
    let selectedModel = "";
    let isGenerating = false;
    let recentImages = [];
    let isLoadingRecent = false;
    let deletingId = null;
    function normalizeModelId(id) {
      return id.replace(/^models\//, "");
    }
    function isBananaModel(id) {
      return normalizeModelId(id).toLowerCase().includes("banana");
    }
    $$renderer2.push(`<div class="google-images-page flex h-screen max-h-screen flex-col overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-black svelte-mf1avr"><div class="relative flex-shrink-0 border-b border-white/10 bg-gray-900/50"><div class="px-6 py-6"><div class="mx-auto max-w-7xl"><div class="flex items-center justify-between"><div class="flex items-center gap-3">`);
    IconGoogleVideo($$renderer2, { classNames: "h-8 w-8 text-blue-400" });
    $$renderer2.push(`<!----> <h1 class="text-2xl font-bold text-white">Gemini Image Studio</h1></div> <button type="button" class="rounded-xl border-2 border-gray-700 bg-gray-800/50 px-4 py-2 text-sm font-medium text-white backdrop-blur-xl transition-all hover:border-blue-500 hover:bg-gray-700/50"${attr("disabled", isLoadingRecent, true)}>`);
    {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`Refresh`);
    }
    $$renderer2.push(`<!--]--></button></div></div></div></div> <div class="flex-1 overflow-y-auto px-6 py-8"><div class="mx-auto max-w-7xl space-y-8"><div class="space-y-6">`);
    {
      $$renderer2.push("<!--[!-->");
      {
        $$renderer2.push("<!--[!-->");
        if (starterImages.length > 0) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div><h2 class="mb-4 text-xl font-bold text-white">✨ Starter Inspiration</h2> <div class="overflow-x-auto pb-4"><div class="flex gap-6" style="width: max-content;"><!--[-->`);
          const each_array = ensure_array_like(starterImages);
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let img = each_array[$$index];
            $$renderer2.push(`<button type="button" class="group relative h-80 w-80 flex-shrink-0 cursor-pointer overflow-hidden rounded-2xl border-2 border-white/10 transition-all hover:scale-105 hover:border-purple-500 hover:shadow-2xl hover:shadow-purple-500/30"><img${attr("src", img.url)}${attr("alt", img.prompt)} class="h-full w-full object-cover transition-transform group-hover:scale-110" loading="lazy"/> <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div></button>`);
          }
          $$renderer2.push(`<!--]--></div></div></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> `);
        if (recentImages.length > 0) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div><h2 class="mb-4 text-xl font-bold text-white">🎨 Your Creations</h2> <div class="overflow-x-auto pb-4"><div class="flex gap-6" style="width: max-content;"><!--[-->`);
          const each_array_1 = ensure_array_like(recentImages);
          for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
            let img = each_array_1[$$index_1];
            $$renderer2.push(`<div class="group relative h-80 w-80 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-white/10 transition-all hover:scale-105 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/30"><button type="button" class="h-full w-full cursor-pointer"><img${attr("src", img.url)}${attr("alt", img.prompt)} class="h-full w-full object-cover transition-transform group-hover:scale-110" loading="lazy"/></button> <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100"><div class="absolute bottom-0 left-0 right-0 p-4"><p class="line-clamp-3 text-sm font-medium text-white svelte-mf1avr">${escape_html(img.prompt)}</p></div></div> <div class="absolute right-3 top-3 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100"><button type="button" class="rounded-lg bg-white/90 p-2.5 text-gray-900 shadow-lg backdrop-blur-sm hover:bg-white">`);
            Copy($$renderer2, { class: "text-lg" });
            $$renderer2.push(`<!----></button> <button type="button" class="rounded-lg bg-red-500/90 p-2.5 text-white shadow-lg backdrop-blur-sm hover:bg-red-600 disabled:opacity-50"${attr("disabled", deletingId === img._id, true)}>`);
            if (deletingId === img._id) {
              $$renderer2.push("<!--[-->");
              IconLoading($$renderer2, {});
            } else {
              $$renderer2.push("<!--[!-->");
              Trash_can($$renderer2, { class: "text-lg" });
            }
            $$renderer2.push(`<!--]--></button></div></div>`);
          }
          $$renderer2.push(`<!--]--></div></div></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`<div class="flex h-64 items-center justify-center"><div class="space-y-3 text-center"><div class="text-6xl">🎨</div> <p class="font-medium text-gray-400">No images yet. Create your first masterpiece!</p></div></div>`);
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div> <div class="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900/80 via-gray-900/60 to-gray-900/80 p-6 shadow-2xl backdrop-blur-2xl"><div class="space-y-4"><div class="flex gap-3"><div class="relative flex-1"><button type="button" class="flex w-full items-center justify-between gap-3 rounded-xl border-2 border-gray-700 bg-gray-800/50 px-4 py-3.5 text-left text-sm text-white shadow-lg transition-all hover:border-blue-500 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"${attr("disabled", isLoadingModels, true)}><span class="flex items-center gap-2 truncate">`);
    if (isBananaModel(selectedModel)) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<img src="/google_studio_page/banana_icon.svg" alt="banana" class="h-4 w-4"/>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
      {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`Select model`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></span> <div class="flex items-center gap-2">`);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></button> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> `);
    {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<button type="button" class="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-gray-700 text-gray-400 transition-all hover:border-blue-500 hover:text-blue-400"${attr("disabled", isGenerating, true)}>`);
      Upload($$renderer2, { class: "text-xl" });
      $$renderer2.push(`<!----></button>`);
    }
    $$renderer2.push(`<!--]--> <input type="file" accept="image/*" class="hidden"${attr("disabled", isGenerating, true)}/></div> <div class="relative"><textarea rows="3"${attr("disabled", isGenerating, true)} placeholder="Describe your image in vivid detail..." class="w-full resize-none rounded-xl border-2 border-gray-700 bg-gray-800/50 px-4 py-3 pr-12 text-white shadow-lg backdrop-blur-xl transition-all placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20">`);
    const $$body = escape_html(prompt);
    if ($$body) {
      $$renderer2.push(`${$$body}`);
    }
    $$renderer2.push(`</textarea> <button type="button" class="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-lg border border-gray-600 bg-gray-700/50 text-gray-300 shadow-sm hover:bg-gray-600/50 disabled:cursor-not-allowed disabled:opacity-50"${attr("disabled", isGenerating, true)} aria-label="Prompt History" title="Last 5 prompts">`);
    Chevron_right($$renderer2, {
      class: "text-lg transition-transform rotate-90"
    });
    $$renderer2.push(`<!----></button> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="flex gap-2"><button type="button" class="flex-1 rounded-xl bg-blue-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"${attr("disabled", isGenerating, true)}>`);
    {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`Generate Image`);
    }
    $$renderer2.push(`<!--]--></button> <button type="button" class="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-purple-500/50 bg-purple-500/10 text-purple-400 transition-all hover:border-purple-400 hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-50"${attr("disabled", isGenerating, true)} title="Enhance Prompt with AI">`);
    IconPrompt($$renderer2, { classNames: "h-5 w-5" });
    $$renderer2.push(`<!----></button> `);
    if (store_get($$store_subs ??= {}, "$page", page).data.isAdmin) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<button type="button" class="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-gray-600/60 bg-gray-800/40 text-gray-200 transition-all hover:bg-gray-700/50 disabled:cursor-not-allowed disabled:opacity-50"${attr("disabled", isGenerating, true)} title="Set Google Studio API key">`);
      IconKey($$renderer2, { classNames: "h-5 w-5" });
      $$renderer2.push(`<!----></button>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></div></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
