import { b as base } from "../../../chunks/server.js";
import "@sveltejs/kit/internal/server";
import { collections } from "../../../chunks/database.js";
import { redirect } from "@sveltejs/kit";
import { c as config } from "../../../chunks/config.js";
async function POST({ locals, cookies }) {
  if (locals.user?._id) {
    const logoutTime = /* @__PURE__ */ new Date();
    const currentUser = await collections.users.findOne({ _id: locals.user._id });
    let durationToAdd = 0;
    if (currentUser?.lastLoginAt) {
      durationToAdd = logoutTime.getTime() - new Date(currentUser.lastLoginAt).getTime();
    }
    await collections.users.updateOne(
      { _id: locals.user._id },
      {
        $set: { lastLogoutAt: logoutTime },
        $inc: { onlineDuration: durationToAdd }
        // Cumulative duration
      }
    );
  }
  await collections.sessions.deleteOne({ sessionId: locals.sessionId });
  cookies.delete(config.COOKIE_NAME, {
    path: "/",
    // So that it works inside the space's iframe
    sameSite: config.ALLOW_INSECURE_COOKIES === "true" ? "lax" : "none",
    secure: !(config.ALLOW_INSECURE_COOKIES === "true"),
    httpOnly: true
  });
  return redirect(302, `${base}/`);
}
export {
  POST
};
