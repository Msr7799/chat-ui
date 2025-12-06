import { config } from "$lib/server/config";
import { logger } from "$lib/server/logger";

export function getApiToken(locals: App.Locals | undefined) {
	const useUserToken = config.USE_USER_TOKEN === "true";
	const fallbackToken = config.OPENAI_API_KEY || config.HF_TOKEN;

	// تسجيل للتشخيص في حالة التطوير (مثل المشروع القديم)
	if (config.PUBLIC_APP_ASSETS !== "huggingchat") {
		logger.debug(
			{
				USE_USER_TOKEN: useUserToken,
				hasLocalsToken: !!locals?.token,
				hasUserHfToken: !!locals?.user && "hfToken" in locals.user,
				OPENAI_API_KEY: fallbackToken ? "SET" : "NOT_SET",
			},
			"getApiToken (chat-ui-new) called"
		);
	}

	if (useUserToken) {
		// 1) إذا كان للمستخدم hfToken مخزَّن في قاعدة البيانات، استخدمه أولاً
		const userHfToken = (locals?.user as { hfToken?: string } | undefined)?.hfToken;
		if (userHfToken && userHfToken.startsWith("hf_")) {
			return userHfToken;
		}

		// 2) وإلا جرّب locals.token إذا كان يبدأ بـ hf_
		if (locals?.token) {
			if (!locals.token.startsWith("hf_")) {
				logger.warn(
					{
						tokenPrefix: locals.token.substring(0, 10),
					},
					"User token does not look like a HuggingFace token, falling back to HF_TOKEN/OPENAI_API_KEY"
				);
			} else {
				return locals.token;
			}
		} else {
			logger.warn("USE_USER_TOKEN is true but no user token found, using fallback");
		}

		// 3) في جميع الحالات السابقة إذا لم نجد توكن مناسب، نرجع إلى التوكن من config
		return fallbackToken;
	}

	// إذا USE_USER_TOKEN = false استخدم التوكن من .env / config
	return fallbackToken;
}
