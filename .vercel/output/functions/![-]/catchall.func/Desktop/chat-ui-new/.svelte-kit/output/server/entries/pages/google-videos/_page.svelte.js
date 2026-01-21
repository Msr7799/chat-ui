import { e as ensure_array_like, c as attr, f as store_get, u as unsubscribe_stores } from "../../../chunks/index2.js";
import "@sveltejs/kit/internal/server";
import { p as page } from "../../../chunks/stores.js";
import { u as useAPIClient } from "../../../chunks/APIClient.js";
import { I as IconGoogle } from "../../../chunks/IconGoogle.js";
import { I as IconPrompt } from "../../../chunks/IconPrompt.js";
import { I as IconKey } from "../../../chunks/IconKey.js";
import { P as Play } from "../../../chunks/play.js";
import { C as Chevron_right } from "../../../chunks/chevron-right.js";
import { e as escape_html } from "../../../chunks/escaping.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    useAPIClient();
    const models = [
      { id: "veo-3.1-generate-preview", label: "Veo 3.1 Preview" },
      {
        id: "veo-3.1-fast-generate-preview",
        label: "Veo 3.1 Preview Fast"
      }
    ];
    const aspectRatios = [
      { id: "16:9", label: "16:9 (Landscape)" },
      { id: "9:16", label: "9:16 (Portrait)" }
    ];
    const resolutions = [
      { id: "720", label: "720p HD" },
      { id: "1080", label: "1080p Full HD" }
    ];
    let mode = "text-to-video";
    let selectedModel = models[0].id;
    let selectedAspectRatio = "16:9";
    let selectedResolution = "1080";
    let prompt = "";
    let isGenerating = false;
    let recentVideos = [];
    let isLoadingRecent = false;
    $$renderer2.push(`<div class="google-videos-page flex h-screen max-h-screen flex-col overflow-hidden svelte-rj6o1h"><div class="hero-section relative flex-shrink-0 svelte-rj6o1h"><video autoplay loop muted playsinline class="absolute inset-0 h-full w-full object-cover svelte-rj6o1h" src="/google_studio_page/1.mp4"><track kind="captions" label="No captions available" class="svelte-rj6o1h"/></video> <div class="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70 svelte-rj6o1h"></div> <div class="relative z-10 px-6 py-12 svelte-rj6o1h"><div class="mx-auto max-w-7xl svelte-rj6o1h"><div class="mb-6 flex items-center gap-4 svelte-rj6o1h"><div class="rounded-xl border border-white/20 bg-white/10 p-3 shadow-2xl backdrop-blur-xl svelte-rj6o1h">`);
    IconGoogle($$renderer2, { classNames: "text-3xl text-white" });
    $$renderer2.push(`<!----></div> <div class="svelte-rj6o1h"><h1 class="mb-2 text-4xl font-bold text-white drop-shadow-2xl svelte-rj6o1h">Veo Studio</h1> <p class="text-lg text-white/90 drop-shadow-lg svelte-rj6o1h">Create stunning AI-powered videos with Veo 3.1</p></div></div></div></div></div> <div class="flex-1 overflow-y-auto bg-gradient-to-b from-gray-900 via-gray-900 to-black svelte-rj6o1h"><div class="mx-auto max-w-7xl px-6 py-8 svelte-rj6o1h"><div class="mb-8 rounded-2xl border border-gray-800/60 bg-gray-900/80 p-6 shadow-2xl backdrop-blur-xl svelte-rj6o1h"><h2 class="mb-6 flex items-center gap-2 text-xl font-bold text-white svelte-rj6o1h">`);
    Play($$renderer2, { class: "text-blue-400" });
    $$renderer2.push(`<!----> Generate New Video</h2> <div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 svelte-rj6o1h"><div class="space-y-2 svelte-rj6o1h"><label for="mode-select" class="text-sm font-medium text-gray-300 svelte-rj6o1h">Mode</label> `);
    $$renderer2.select(
      {
        id: "mode-select",
        class: "w-full rounded-xl border-2 border-gray-700 bg-gray-800 px-4 py-3 text-sm font-medium text-white shadow-lg transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20",
        value: mode,
        disabled: isGenerating
      },
      ($$renderer3) => {
        $$renderer3.option(
          { value: "text-to-video", class: "" },
          ($$renderer4) => {
            $$renderer4.push(`📝 Text to Video`);
          },
          "svelte-rj6o1h"
        );
        $$renderer3.option(
          { value: "image-to-video", class: "" },
          ($$renderer4) => {
            $$renderer4.push(`🖼️ Image to Video`);
          },
          "svelte-rj6o1h"
        );
      },
      "svelte-rj6o1h"
    );
    $$renderer2.push(`</div> <div class="space-y-2 svelte-rj6o1h"><label for="model-select" class="text-sm font-medium text-gray-300 svelte-rj6o1h">Model</label> `);
    $$renderer2.select(
      {
        id: "model-select",
        class: "w-full rounded-xl border-2 border-gray-700 bg-gray-800 px-4 py-3 text-sm font-medium text-white shadow-lg transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20",
        value: selectedModel,
        disabled: isGenerating
      },
      ($$renderer3) => {
        $$renderer3.push(`<!--[-->`);
        const each_array = ensure_array_like(models);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let m = each_array[$$index];
          $$renderer3.option(
            { value: m.id, class: "" },
            ($$renderer4) => {
              $$renderer4.push(`${escape_html(m.label)}`);
            },
            "svelte-rj6o1h"
          );
        }
        $$renderer3.push(`<!--]-->`);
      },
      "svelte-rj6o1h"
    );
    $$renderer2.push(`</div> <div class="space-y-2 svelte-rj6o1h"><label for="aspect-ratio-select" class="text-sm font-medium text-gray-300 svelte-rj6o1h">Aspect Ratio</label> `);
    $$renderer2.select(
      {
        id: "aspect-ratio-select",
        class: "w-full rounded-xl border-2 border-gray-700 bg-gray-800 px-4 py-3 text-sm font-medium text-white shadow-lg transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20",
        value: selectedAspectRatio,
        disabled: isGenerating
      },
      ($$renderer3) => {
        $$renderer3.push(`<!--[-->`);
        const each_array_1 = ensure_array_like(aspectRatios);
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let ar = each_array_1[$$index_1];
          $$renderer3.option(
            { value: ar.id, class: "" },
            ($$renderer4) => {
              $$renderer4.push(`${escape_html(ar.label)}`);
            },
            "svelte-rj6o1h"
          );
        }
        $$renderer3.push(`<!--]-->`);
      },
      "svelte-rj6o1h"
    );
    $$renderer2.push(`</div> <div class="space-y-2 svelte-rj6o1h"><label for="resolution-select" class="text-sm font-medium text-gray-300 svelte-rj6o1h">Resolution</label> `);
    $$renderer2.select(
      {
        id: "resolution-select",
        class: "w-full rounded-xl border-2 border-gray-700 bg-gray-800 px-4 py-3 text-sm font-medium text-white shadow-lg transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20",
        value: selectedResolution,
        disabled: isGenerating
      },
      ($$renderer3) => {
        $$renderer3.push(`<!--[-->`);
        const each_array_2 = ensure_array_like(resolutions);
        for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
          let res = each_array_2[$$index_2];
          $$renderer3.option(
            { value: res.id, class: "" },
            ($$renderer4) => {
              $$renderer4.push(`${escape_html(res.label)}`);
            },
            "svelte-rj6o1h"
          );
        }
        $$renderer3.push(`<!--]-->`);
      },
      "svelte-rj6o1h"
    );
    $$renderer2.push(`</div></div> <div class="mb-6 flex gap-4 svelte-rj6o1h">`);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="min-w-0 flex-1 space-y-3 svelte-rj6o1h"><div class="flex items-center gap-2 svelte-rj6o1h"><div class="relative min-w-0 flex-1 svelte-rj6o1h"><textarea rows="3"${attr("disabled", isGenerating, true)} placeholder="Describe your video in detail..." class="w-full resize-none rounded-xl border-2 border-gray-700 bg-gray-800 px-4 py-3 pr-12 text-white shadow-lg transition-all placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 svelte-rj6o1h">`);
    const $$body = escape_html(prompt);
    if ($$body) {
      $$renderer2.push(`${$$body}`);
    }
    $$renderer2.push(`</textarea> <button type="button" class="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-md border border-gray-600 bg-gray-700 text-gray-300 shadow-sm hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50 svelte-rj6o1h"${attr("disabled", isGenerating, true)} aria-label="Prompt History" title="Last 5 prompts">`);
    Chevron_right($$renderer2, {
      class: "text-lg transition-transform rotate-90"
    });
    $$renderer2.push(`<!----></button> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> <button type="button" class="flex h-12 w-12 flex-none items-center justify-center rounded-lg border-2 border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50 svelte-rj6o1h"${attr("disabled", isGenerating, true)} aria-label="Enhance Prompt" title="Enhance Prompt with AI">`);
    IconPrompt($$renderer2, { classNames: "h-5 w-5" });
    $$renderer2.push(`<!----></button> `);
    if (store_get($$store_subs ??= {}, "$page", page).data.isAdmin) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<button type="button" class="flex h-12 w-12 flex-none items-center justify-center rounded-lg border-2 border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50 svelte-rj6o1h"${attr("disabled", isGenerating, true)} aria-label="Set Google Studio API key" title="Set Google Studio API key">`);
      IconKey($$renderer2, { classNames: "h-5 w-5" });
      $$renderer2.push(`<!----></button>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <button type="button" class="w-full rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 svelte-rj6o1h"${attr("disabled", isGenerating, true)}>`);
    {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<span class="flex items-center justify-center gap-2 svelte-rj6o1h">`);
      Play($$renderer2, { class: "text-lg" });
      $$renderer2.push(`<!----> Generate Video</span>`);
    }
    $$renderer2.push(`<!--]--></button></div></div></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="space-y-6 svelte-rj6o1h"><div class="flex items-center justify-between svelte-rj6o1h"><h2 class="flex items-center gap-2 text-2xl font-bold text-white svelte-rj6o1h">📚 Generated Videos</h2> <button type="button" class="rounded-lg border-2 border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-gray-700 svelte-rj6o1h"${attr("disabled", isLoadingRecent, true)}>`);
    {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`Refresh`);
    }
    $$renderer2.push(`<!--]--></button></div> `);
    {
      $$renderer2.push("<!--[!-->");
      {
        $$renderer2.push("<!--[!-->");
        if (recentVideos.length === 0) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="flex h-64 items-center justify-center svelte-rj6o1h"><div class="space-y-3 text-center svelte-rj6o1h"><div class="text-6xl svelte-rj6o1h">🎬</div> <p class="font-medium text-gray-400 svelte-rj6o1h">No videos yet. Create your first one!</p></div></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 svelte-rj6o1h"><!--[-->`);
          const each_array_4 = ensure_array_like(recentVideos);
          for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
            let v = each_array_4[$$index_4];
            $$renderer2.push(`<button type="button" class="group relative overflow-hidden rounded-xl border-2 border-gray-700 bg-gray-800 transition-all hover:scale-[1.02] hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/20 svelte-rj6o1h"><div class="relative aspect-video w-full overflow-hidden bg-black svelte-rj6o1h"><video${attr("src", v.url)} class="h-full w-full object-cover transition-opacity group-hover:opacity-80 svelte-rj6o1h" muted preload="metadata"><track kind="captions" label="No captions available" class="svelte-rj6o1h"/></video> <div class="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100 svelte-rj6o1h"><div class="scale-90 transform rounded-full bg-blue-500 p-4 transition-transform group-hover:scale-100 svelte-rj6o1h">`);
            Play($$renderer2, { class: "text-2xl text-white" });
            $$renderer2.push(`<!----></div></div> <div class="absolute left-3 top-3 flex gap-2 svelte-rj6o1h"><span class="rounded-full bg-blue-500/90 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm svelte-rj6o1h">${escape_html(v.mode === "text-to-video" ? "Text" : "Image")}</span></div></div> <div class="p-4 svelte-rj6o1h"><p class="line-clamp-2 text-left text-sm font-medium text-gray-300 svelte-rj6o1h">${escape_html(v.prompt)}</p> <p class="mt-2 text-left text-xs text-gray-500 svelte-rj6o1h">${escape_html(new Date(v.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }))}</p></div></button>`);
          }
          $$renderer2.push(`<!--]--></div>`);
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div></div></div></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
