import { config } from "$lib/server/config";
import { logger } from "$lib/server/logger";

export function getApiToken(locals: App.Locals | undefined) {
	const useUserToken = config.USE_USER_TOKEN === "true";
	const fallbackToken = config.OPENAI_API_KEY || config.HF_TOKEN;
	
	// ✅ تسجيل القيم للتشخيص (في dev mode فقط)
	if (config.PUBLIC_APP_ASSETS !== "huggingchat") {
		logger.debug({
			USE_USER_TOKEN: useUserToken,
			hasLocalsToken: !!locals?.token,
			OPENAI_API_KEY: fallbackToken ? "SET" : "NOT_SET",
		}, "getApiToken called");
	}

	// ⚠️ إذا كان USE_USER_TOKEN مفعّل، استخدم user token
	if (useUserToken) {
		if (!locals?.token) {
			logger.warn("USE_USER_TOKEN is true but no user token found, using fallback");
			return fallbackToken;
		}
		
		// ✅ التحقق من أن token يبدأ بـ "hf_" (HuggingFace token)
		if (!locals.token.startsWith("hf_")) {
			logger.warn({
				tokenPrefix: locals.token.substring(0, 10),
			}, "User token doesn't look like a HuggingFace token, using fallback");
			return fallbackToken;
		}
		
		return locals.token;
	}
	
	// ✅ استخدام OPENAI_API_KEY من config كـ fallback
	return fallbackToken;
}
