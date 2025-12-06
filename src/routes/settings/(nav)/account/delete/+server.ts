import { collections } from "$lib/server/database";
import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ locals, cookies }) => {
	if (!locals.user) {
		throw redirect(303, "/login");
	}

	const userId = locals.user._id;

	try {
		// Delete all user's conversations
		await collections.conversations.deleteMany({ userId });

		// Delete all user's generated images
		const userImages = await collections.generatedImages.find({ userId }).toArray();

		// TODO: Delete images from Cloudinary
		// This would require importing the cloudinary delete function
		// and deleting each image by its publicId

		// Delete all user's generated images from database
		await collections.generatedImages.deleteMany({ userId });

		// Delete all user's sessions
		await collections.sessions.deleteMany({ userId });

		// Finally delete the user account
		await collections.users.deleteOne({ _id: userId });

		// Clear the session cookie
		cookies.delete("sessionId", { path: "/" });

		// Return success
		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Error deleting user account:", error);
		return new Response(JSON.stringify({ error: "Failed to delete account" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
