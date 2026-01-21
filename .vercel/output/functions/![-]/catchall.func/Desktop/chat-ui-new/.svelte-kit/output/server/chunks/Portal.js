import "clsx";
import { o as onDestroy } from "./index-server.js";
function Portal($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { children } = $$props;
    onDestroy(() => {
    });
    $$renderer2.push(`<div class="contents" hidden="">`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></div>`);
  });
}
export {
  Portal as P
};
