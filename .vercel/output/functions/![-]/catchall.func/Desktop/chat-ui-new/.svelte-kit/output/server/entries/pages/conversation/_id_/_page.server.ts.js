import { redirect } from "@sveltejs/kit";
import { l as loginEnabled } from "../../../../chunks/auth.js";
import { c as createConversationFromShare } from "../../../../chunks/conversation.js";
const load = async ({ url, params, locals, request }) => {
  if (loginEnabled && locals.user && params.id.length === 7) {
    const leafId = url.searchParams.get("leafId");
    const conversationId = await createConversationFromShare(
      params.id,
      locals,
      request.headers.get("User-Agent") ?? void 0
    );
    return redirect(
      302,
      `../conversation/${conversationId}?leafId=${leafId}&fromShare=${params.id}`
    );
  }
};
export {
  load
};
