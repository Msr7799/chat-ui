import { e as ensure_array_like, c as attr } from "../../../chunks/index2.js";
import "@sveltejs/kit/internal/server";
import { u as useAPIClient, h as handleResponse } from "../../../chunks/APIClient.js";
import { I as IconLoading } from "../../../chunks/IconLoading.js";
import { I as Image, a as ImageGenerationModal, D as Download } from "../../../chunks/download.js";
import { T as Trash_can } from "../../../chunks/trash-can.js";
import { e as escape_html } from "../../../chunks/escaping.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let images = [];
    let loading = true;
    let error = null;
    let isModalOpen = false;
    let deletingId = null;
    const client = useAPIClient();
    async function loadImages() {
      loading = true;
      error = null;
      try {
        const response = await client.images.get().then(handleResponse);
        images = (response.images || []).map((img) => ({ ...img, _id: img._id.toString(), cloudinaryUrl: img.url }));
      } catch (err) {
        console.error("Failed to load images:", err);
        error = String(err);
      } finally {
        loading = false;
      }
    }
    function onImageGenerated() {
      loadImages();
    }
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<div class="flex h-screen max-h-screen flex-col overflow-hidden md:pl-14"><div class="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900"><div class="flex items-center justify-between"><div><h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Image Gallery</h1> <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Your AI-generated images with FLUX</p></div> <button type="button" class="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-md transition-all hover:bg-blue-700"><span class="flex items-center gap-2">`);
      Image($$renderer3, { class: "text-lg" });
      $$renderer3.push(`<!----> Generate New</span></button></div></div> <div class="flex-1 overflow-y-auto overflow-x-hidden p-6">`);
      if (loading) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<div class="flex h-64 items-center justify-center">`);
        IconLoading($$renderer3, {});
        $$renderer3.push(`<!----></div>`);
      } else {
        $$renderer3.push("<!--[!-->");
        if (error) {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<div class="rounded-lg bg-red-50 p-4 dark:bg-red-900/20"><p class="text-sm text-red-600 dark:text-red-400">Error: ${escape_html(error)}</p></div>`);
        } else {
          $$renderer3.push("<!--[!-->");
          if (images.length === 0) {
            $$renderer3.push("<!--[-->");
            $$renderer3.push(`<div class="flex h-64 flex-col items-center justify-center text-gray-500 dark:text-gray-400">`);
            Image($$renderer3, { class: "mb-4 text-6xl opacity-50" });
            $$renderer3.push(`<!----> <p class="text-lg font-medium">No images yet</p> <p class="mt-2 text-sm">Click "Generate New" to create your first AI image</p></div>`);
          } else {
            $$renderer3.push("<!--[!-->");
            $$renderer3.push(`<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"><!--[-->`);
            const each_array = ensure_array_like(images);
            for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
              let image = each_array[$$index];
              $$renderer3.push(`<div class="group relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"><button type="button" class="block w-full overflow-hidden"><img${attr("src", image.url)}${attr("alt", image.prompt)} class="aspect-square w-full object-cover transition-transform group-hover:scale-105" loading="lazy"/></button> <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100"><div class="flex gap-2"><button type="button" class="rounded-lg bg-white p-2 text-gray-900 transition-transform hover:scale-110" aria-label="View fullscreen">`);
              Image($$renderer3, { class: "text-xl" });
              $$renderer3.push(`<!----></button> <a${attr("href", image.url)} download="generated-image.png" class="rounded-lg bg-white p-2 text-gray-900 transition-transform hover:scale-110" aria-label="Download">`);
              Download($$renderer3, { class: "text-xl" });
              $$renderer3.push(`<!----></a> <button type="button" class="rounded-lg bg-red-600 p-2 text-white transition-transform hover:scale-110"${attr("disabled", deletingId === image._id, true)} aria-label="Delete">`);
              if (deletingId === image._id) {
                $$renderer3.push("<!--[-->");
                IconLoading($$renderer3, {});
              } else {
                $$renderer3.push("<!--[!-->");
                Trash_can($$renderer3, { class: "text-xl" });
              }
              $$renderer3.push(`<!--]--></button></div> <div class="mt-2 px-4 text-center"><span class="inline-block rounded-full bg-black/50 px-2 py-1 text-xs text-white backdrop-blur-sm">${escape_html(image.modelUsed || "FLUX.1-schnell")}</span></div></div> <div class="p-3"><p class="line-clamp-2 text-sm text-gray-700 dark:text-gray-300 svelte-16h6p05">${escape_html(image.prompt)}</p> <div class="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400"><span>${escape_html(new Date(image.createdAt).toLocaleDateString())}</span> <span class="truncate pl-2"${attr("title", image.modelUsed)}>${escape_html(image.modelUsed ? image.modelUsed.split("/").pop() : "FLUX.1-schnell")}</span></div></div></div>`);
            }
            $$renderer3.push(`<!--]--></div>`);
          }
          $$renderer3.push(`<!--]-->`);
        }
        $$renderer3.push(`<!--]-->`);
      }
      $$renderer3.push(`<!--]--></div></div> `);
      {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> `);
      ImageGenerationModal($$renderer3, {
        onImageGenerated,
        get open() {
          return isModalOpen;
        },
        set open($$value) {
          isModalOpen = $$value;
          $$settled = false;
        }
      });
      $$renderer3.push(`<!---->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
  });
}
export {
  _page as default
};
