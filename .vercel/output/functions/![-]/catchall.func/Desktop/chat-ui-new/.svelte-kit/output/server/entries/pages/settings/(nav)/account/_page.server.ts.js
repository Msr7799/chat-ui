import { collections } from "../../../../../chunks/database.js";
import { redirect } from "@sveltejs/kit";
const load = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, "/login");
  }
  const fullUser = await collections.users.findOne({ _id: locals.user._id });
  if (!fullUser) {
    throw redirect(302, "/login");
  }
  return {
    user: {
      // تأكد أن _id عبارة عن string وليس ObjectId حتى يكون قابلاً للتسلسل من SvelteKit
      _id: String(fullUser._id),
      username: fullUser.username,
      name: fullUser.name,
      email: fullUser.email,
      avatarUrl: fullUser.avatarUrl,
      hfUserId: fullUser.hfUserId,
      isAdmin: fullUser.isAdmin,
      isEarlyAccess: fullUser.isEarlyAccess,
      // Add the session tracking fields
      lastLoginAt: fullUser.lastLoginAt,
      lastLogoutAt: fullUser.lastLogoutAt,
      onlineDuration: fullUser.onlineDuration,
      createdAt: fullUser.createdAt
    }
  };
};
export {
  load
};
