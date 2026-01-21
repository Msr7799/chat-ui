import { collections } from "../../../../../../chunks/database.js";
import { redirect } from "@sveltejs/kit";
const POST = async ({ locals, cookies }) => {
  if (!locals.user) {
    throw redirect(303, "/login");
  }
  const userId = locals.user._id;
  try {
    await collections.conversations.deleteMany({ userId });
    const userImages = await collections.generatedImages.find({ userId }).toArray();
    await collections.generatedImages.deleteMany({ userId });
    await collections.sessions.deleteMany({ userId });
    await collections.users.deleteOne({ _id: userId });
    cookies.delete("sessionId", { path: "/" });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error deleting user account:", error);
    return new Response(JSON.stringify({ error: "Failed to delete account" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
export {
  POST
};
