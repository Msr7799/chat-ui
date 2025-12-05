import { triggerOauthFlow, loginEnabled } from "$lib/server/auth";
import { redirect } from "@sveltejs/kit";
import { base } from "$app/paths";

export async function GET({ request, url, locals }) {
	console.log("🟢 +server.ts GET called!");
	console.log("🟢 URL:", url.toString());
	console.log("🟢 Request URL:", request.url);
	
	// ✅ إذا كان OAuth غير مُعد، نعيد redirect للصفحة الرئيسية
	if (!loginEnabled) {
		console.log("⚠️ OAuth not configured, redirecting to home as anonymous user");
		const next = url.searchParams.get("next") || `${base}/`;
		throw redirect(302, next);
	}
	
	return await triggerOauthFlow({ request, url, locals });
}
