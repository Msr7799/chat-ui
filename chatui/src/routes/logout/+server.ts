import { dev } from "$app/environment";
import { base } from "$app/paths";
import { collections } from "$lib/server/database";
import { redirect } from "@sveltejs/kit";
import { config } from "$lib/server/config";

export async function POST({ locals, cookies }) {
	if (locals.user?._id) {
		const logoutTime = new Date();

		// Fetch current user to get lastLoginAt and current onlineDuration
		const currentUser = await collections.users.findOne({ _id: locals.user._id });

		let durationToAdd = 0;
		if (currentUser?.lastLoginAt) {
			durationToAdd = logoutTime.getTime() - new Date(currentUser.lastLoginAt).getTime();
		}

		await collections.users.updateOne(
			{ _id: locals.user._id },
			{
				$set: { lastLogoutAt: logoutTime },
				$inc: { onlineDuration: durationToAdd }, // Cumulative duration
			}
		);
	}

	await collections.sessions.deleteOne({ sessionId: locals.sessionId });

	cookies.delete(config.COOKIE_NAME, {
		path: "/",
		// So that it works inside the space's iframe
		sameSite: dev || config.ALLOW_INSECURE_COOKIES === "true" ? "lax" : "none",
		secure: !dev && !(config.ALLOW_INSECURE_COOKIES === "true"),
		httpOnly: true,
	});
	return redirect(302, `${base}/`);
}
