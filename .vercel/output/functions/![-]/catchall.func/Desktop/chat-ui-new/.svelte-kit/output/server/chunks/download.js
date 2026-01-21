import { s as sanitize_props, a as attributes, e as ensure_array_like, c as attr, g as bind_props, d as stringify } from "./index2.js";
import { b as base } from "./server.js";
import "@sveltejs/kit/internal/server";
import { u as useAPIClient, h as handleResponse } from "./APIClient.js";
import { P as Portal } from "./Portal.js";
import { C as Close } from "./close.js";
import { h as html } from "./html.js";
import { U as Upload } from "./IconLoading.js";
import { e as escape_html } from "./escaping.js";
function Image($$renderer, $$props) {
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
  )}>${html(`<path fill="currentColor" d="M19 14a3 3 0 1 0-3-3a3 3 0 0 0 3 3m0-4a1 1 0 1 1-1 1a1 1 0 0 1 1-1"/><path fill="currentColor" d="M26 4H6a2 2 0 0 0-2 2v20a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2m0 22H6v-6l5-5l5.59 5.59a2 2 0 0 0 2.82 0L21 19l5 5Zm0-4.83l-3.59-3.59a2 2 0 0 0-2.82 0L18 19.17l-5.59-5.59a2 2 0 0 0-2.82 0L6 17.17V6h20Z"/>`)}</svg>`);
}
function ImageGenerationModal($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { open = false, onClose, onImageGenerated } = $$props;
    const HF_MODELS = [
      {
        id: "black-forest-labs/FLUX.1-schnell",
        name: "FLUX.1-schnell (Fast & High Quality)"
      },
      {
        id: "stabilityai/stable-diffusion-xl-base-1.0",
        name: "Stable Diffusion XL (Open Source Leader)"
      },
      {
        id: "ByteDance/SDXL-Lightning",
        name: "SDXL-Lightning (Ultra Fast)"
      },
      {
        id: "stabilityai/stable-diffusion-2-1",
        name: "Stable Diffusion 2.1 (Lightweight)"
      },
      {
        id: "playgroundai/playground-v2.5-1024px-aesthetic",
        name: "Playground v2.5 (Aesthetic Focused)"
      }
    ];
    let provider = "google";
    let googleModels = [];
    let isLoadingGoogleModels = false;
    let googleModelsError = null;
    let prompt = "";
    let selectedModel = HF_MODELS[0].id;
    let isGenerating = false;
    let generatedImageUrl = null;
    let error = null;
    let referencePreviewUrl = null;
    const client = useAPIClient();
    async function loadGoogleModels() {
      if (isLoadingGoogleModels) return;
      isLoadingGoogleModels = true;
      googleModelsError = null;
      try {
        const res = await client.images.google.models.get();
        const data = handleResponse(res);
        googleModels = (data.models || []).filter((m) => typeof m.id === "string" && m.id.includes("image")).sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
        if (provider === "google" && googleModels.length > 0) {
          selectedModel = googleModels[0].id;
        }
      } catch (err) {
        googleModelsError = String(err);
      } finally {
        isLoadingGoogleModels = false;
      }
    }
    function setProvider(next) {
      provider = next;
      generatedImageUrl = null;
      error = null;
      if (provider !== "google") {
        if (referencePreviewUrl) {
          URL.revokeObjectURL(referencePreviewUrl);
        }
        referencePreviewUrl = null;
      }
      if (provider === "huggingface") {
        selectedModel = HF_MODELS[0].id;
      } else {
        if (googleModels.length > 0) {
          selectedModel = googleModels[0].id;
        } else {
          loadGoogleModels();
        }
      }
    }
    function onProviderChange(e) {
      const el = e.currentTarget;
      if (!el) return;
      setProvider(el.value);
    }
    if (
      // Preload Google models when modal opens (to keep UX snappy).
      // Ensure selection is consistent
      open
    ) {
      $$renderer2.push("<!--[-->");
      Portal($$renderer2, {
        children: ($$renderer3) => {
          $$renderer3.push(`<div class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" tabindex="-1"><div class="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-900 svelte-yi78vo" role="document" tabindex="0"><div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800"><div class="flex items-center gap-3"><div class="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">`);
          Image($$renderer3, { class: "text-xl text-blue-600 dark:text-blue-400" });
          $$renderer3.push(`<!----></div> <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Generate Image with FLUX</h2></div> <button type="button" class="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200" aria-label="Close">`);
          Close($$renderer3, { class: "text-xl" });
          $$renderer3.push(`<!----></button></div> <div class="space-y-6 p-6"><div><label for="image-provider" class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Provider</label> `);
          $$renderer3.select(
            {
              id: "image-provider",
              value: provider,
              disabled: isGenerating,
              class: "mb-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100",
              onchange: onProviderChange
            },
            ($$renderer4) => {
              $$renderer4.option({ value: "google" }, ($$renderer5) => {
                $$renderer5.push(`Google AI Studio`);
              });
              $$renderer4.option({ value: "huggingface" }, ($$renderer5) => {
                $$renderer5.push(`HuggingFace`);
              });
            }
          );
          $$renderer3.push(` <label for="image-model" class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Select Model</label> `);
          $$renderer3.select(
            {
              id: "image-model",
              value: selectedModel,
              disabled: isGenerating,
              class: "mb-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            },
            ($$renderer4) => {
              if (provider === "google") {
                $$renderer4.push("<!--[-->");
                if (isLoadingGoogleModels) {
                  $$renderer4.push("<!--[-->");
                  $$renderer4.option({ value: selectedModel }, ($$renderer5) => {
                    $$renderer5.push(`Loading Google models...`);
                  });
                } else {
                  $$renderer4.push("<!--[!-->");
                  $$renderer4.push(`<!--[-->`);
                  const each_array = ensure_array_like(googleModels);
                  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                    let model = each_array[$$index];
                    $$renderer4.option({ value: model.id }, ($$renderer5) => {
                      $$renderer5.push(`${escape_html(model.id)}`);
                    });
                  }
                  $$renderer4.push(`<!--]-->`);
                }
                $$renderer4.push(`<!--]-->`);
              } else {
                $$renderer4.push("<!--[!-->");
                $$renderer4.push(`<!--[-->`);
                const each_array_1 = ensure_array_like(HF_MODELS);
                for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                  let model = each_array_1[$$index_1];
                  $$renderer4.option({ value: model.id }, ($$renderer5) => {
                    $$renderer5.push(`${escape_html(model.name)}`);
                  });
                }
                $$renderer4.push(`<!--]-->`);
              }
              $$renderer4.push(`<!--]-->`);
            }
          );
          $$renderer3.push(` `);
          if (provider === "google" && googleModelsError) {
            $$renderer3.push("<!--[-->");
            $$renderer3.push(`<div class="mb-4 rounded-lg bg-red-50 p-4 dark:bg-red-900/20"><p class="text-sm text-red-600 dark:text-red-400">${escape_html(googleModelsError)}</p></div>`);
          } else {
            $$renderer3.push("<!--[!-->");
          }
          $$renderer3.push(`<!--]--> <label for="image-prompt" class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Image Description</label> <textarea id="image-prompt" placeholder="A beautiful sunset over mountains..." rows="3" class="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm transition-all placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"${attr("disabled", isGenerating, true)}>`);
          const $$body = escape_html(prompt);
          if ($$body) {
            $$renderer3.push(`${$$body}`);
          }
          $$renderer3.push(`</textarea> <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Press Ctrl+Enter to generate • Max 500 characters</p> `);
          if (provider === "google") {
            $$renderer3.push("<!--[-->");
            $$renderer3.push(`<div class="mt-4"><div class="mb-2 flex items-center justify-between"><p class="text-sm font-medium text-gray-700 dark:text-gray-300">Reference image (optional)</p> `);
            if (referencePreviewUrl) {
              $$renderer3.push("<!--[-->");
              $$renderer3.push(`<button type="button" class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">Remove</button>`);
            } else {
              $$renderer3.push("<!--[!-->");
            }
            $$renderer3.push(`<!--]--></div> `);
            if (referencePreviewUrl) {
              $$renderer3.push("<!--[-->");
              $$renderer3.push(`<div class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"><img${attr("src", referencePreviewUrl)} alt="Reference" class="max-h-48 w-full object-contain"/></div>`);
            } else {
              $$renderer3.push("<!--[!-->");
              $$renderer3.push(`<label class="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">`);
              Upload($$renderer3, { class: "text-lg" });
              $$renderer3.push(`<!----> <span>Upload a reference image</span> <input type="file" accept="image/*" class="hidden"${attr("disabled", isGenerating, true)}/></label>`);
            }
            $$renderer3.push(`<!--]--></div>`);
          } else {
            $$renderer3.push("<!--[!-->");
          }
          $$renderer3.push(`<!--]--></div> <button type="button" class="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-md transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"${attr("disabled", !prompt.trim() || isGenerating, true)}>`);
          {
            $$renderer3.push("<!--[!-->");
            $$renderer3.push(`Generate Image`);
          }
          $$renderer3.push(`<!--]--></button> `);
          if (error) {
            $$renderer3.push("<!--[-->");
            $$renderer3.push(`<div class="rounded-lg bg-red-50 p-4 dark:bg-red-900/20"><p class="text-sm text-red-600 dark:text-red-400">${escape_html(error)}</p></div>`);
          } else {
            $$renderer3.push("<!--[!-->");
          }
          $$renderer3.push(`<!--]--> `);
          if (generatedImageUrl) {
            $$renderer3.push("<!--[-->");
            $$renderer3.push(`<div class="space-y-4"><div class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"><img${attr("src", generatedImageUrl)}${attr("alt", prompt)} class="w-full"/></div> <div class="flex gap-3"><a${attr("href", generatedImageUrl)} download="generated-image.png" class="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-center font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">Download</a> <a${attr("href", `${stringify(base)}/gallery`)} class="flex-1 rounded-lg bg-gray-900 px-4 py-2 text-center font-medium text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200">View Gallery</a></div></div>`);
          } else {
            $$renderer3.push("<!--[!-->");
          }
          $$renderer3.push(`<!--]--></div></div></div>`);
        }
      });
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { open });
  });
}
function Download($$renderer, $$props) {
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
  )}>${html(`<path fill="currentColor" d="M26 24v4H6v-4H4v4a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2v-4zm0-10l-1.41-1.41L17 20.17V2h-2v18.17l-7.59-7.58L6 14l10 10z"/>`)}</svg>`);
}
export {
  Download as D,
  Image as I,
  ImageGenerationModal as a
};
