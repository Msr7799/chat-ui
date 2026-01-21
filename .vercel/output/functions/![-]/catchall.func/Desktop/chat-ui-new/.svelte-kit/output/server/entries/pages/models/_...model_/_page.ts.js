import { b as base } from "../../../../chunks/server.js";
import "@sveltejs/kit/internal/server";
async function load({ params, parent, fetch }) {
  await fetch(`${base}/api/v2/models/${params.model}/subscribe`, {
    method: "POST"
  });
  return {
    settings: await parent().then((data) => ({
      ...data.settings,
      activeModel: params.model
    }))
  };
}
export {
  load
};
