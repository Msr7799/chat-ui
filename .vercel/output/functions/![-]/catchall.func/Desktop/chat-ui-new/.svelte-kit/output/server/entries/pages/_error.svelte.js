import { e as escape_html } from "../../chunks/escaping.js";
import "clsx";
import { p as page } from "../../chunks/index3.js";
function _error($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<div class="flex items-center justify-center bg-gradient-to-t from-gray-200 text-gray-800 dark:from-gray-700 dark:text-gray-300"><div class="align-center -mt-24 flex flex-col justify-center rounded-xl border bg-white px-8 pb-2 pt-4 text-center dark:border-gray-700 dark:bg-gray-800"><h1 class="mb-2 text-5xl font-semibold">${escape_html(page.status)}</h1> <div class="-mx-8 my-2 h-px bg-gray-200 dark:bg-gray-700"></div> <h2 class="max-w-sm text-lg">${escape_html(page.error?.message)}</h2> `);
    if (page.error?.errorId) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="-mx-8 my-2 h-px bg-gray-200 dark:bg-gray-700"></div> <pre class="max-w-sm whitespace-pre-wrap text-left font-mono text-xs">${escape_html(page.error.errorId)}</pre>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></div>`);
  });
}
export {
  _error as default
};
