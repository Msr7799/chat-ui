import { b as attr_class, d as stringify, h as clsx } from "./index2.js";
import { o as onDestroy } from "./index-server.js";
import { C as Copy } from "./copy.js";
import { e as escape_html } from "./escaping.js";
function Tooltip($$renderer, $$props) {
  let {
    classNames = "",
    label = "Copied",
    position = "left-1/2 top-full transform -translate-x-1/2 translate-y-2"
  } = $$props;
  $$renderer.push(`<div${attr_class(` pointer-events-none absolute rounded bg-black px-2 py-1 font-normal leading-tight text-white shadow transition-opacity ${stringify(position)} ${stringify(classNames)} `)}><div class="absolute bottom-full left-1/2 h-0 w-0 -translate-x-1/2 transform border-4 border-t-0 border-black" style="border-left-color: transparent; border-right-color: transparent;"></div> ${escape_html(label)}</div>`);
}
function CopyToClipBoardBtn($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      classNames = "",
      iconClassNames = "",
      value,
      children,
      onClick,
      showTooltip = true
    } = $$props;
    onDestroy(() => {
    });
    $$renderer2.push(`<button${attr_class(clsx(classNames))} title="Copy to clipboard" type="button"><div class="relative">`);
    if (children) {
      $$renderer2.push("<!--[-->");
      children($$renderer2);
      $$renderer2.push(`<!---->`);
    } else {
      $$renderer2.push("<!--[!-->");
      Copy($$renderer2, { class: iconClassNames });
    }
    $$renderer2.push(`<!--]--> `);
    if (showTooltip) {
      $$renderer2.push("<!--[-->");
      Tooltip($$renderer2, { classNames: "opacity-0" });
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></button>`);
  });
}
export {
  CopyToClipBoardBtn as C
};
