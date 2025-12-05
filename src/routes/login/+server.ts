import { triggerOauthFlow, loginEnabled } from "$lib/server/auth";
import { redirect } from "@sveltejs/kit";
import { base } from "$app/paths";

export async function GET({ request, url, locals }) {
	// ✅ إذا كان OAuth غير مُعد، نعيد redirect للصفحة الرئيسية
	if (!loginEnabled) {
		const next = url.searchParams.get("next") || `${base}/`;
		throw redirect(302, next);
	}
	
	return await triggerOauthFlow({ request, url, locals });
}
