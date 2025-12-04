import { triggerOauthFlow } from "$lib/server/auth";

export async function GET({ request, url, locals }) {
	console.log("🟢 +server.ts GET called!");
	console.log("🟢 URL:", url.toString());
	console.log("🟢 Request URL:", request.url);
	return await triggerOauthFlow({ request, url, locals });
}
