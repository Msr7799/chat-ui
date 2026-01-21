import { u as useAPIClient, h as handleResponse } from "../../../../chunks/APIClient.js";
import { U as UrlDependency } from "../../../../chunks/UrlDependency.js";
import { redirect } from "@sveltejs/kit";
const load = async ({ params, depends, fetch, url }) => {
  depends(UrlDependency.Conversation);
  const client = useAPIClient({ fetch, origin: url.origin });
  try {
    return await client.conversations({ id: params.id }).get({ query: { fromShare: url.searchParams.get("fromShare") ?? void 0 } }).then(handleResponse);
  } catch {
    redirect(302, "/");
  }
};
export {
  load
};
