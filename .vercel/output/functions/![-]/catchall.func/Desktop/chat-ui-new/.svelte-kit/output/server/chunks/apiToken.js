import { c as config } from "./config.js";
import { l as logger } from "./logger.js";
function getApiToken(locals) {
  const useUserToken = config.USE_USER_TOKEN === "true";
  const fallbackToken = config.OPENAI_API_KEY || config.HF_TOKEN;
  if (config.PUBLIC_APP_ASSETS !== "huggingchat") {
    logger.debug(
      {
        USE_USER_TOKEN: useUserToken,
        hasLocalsToken: !!locals?.token,
        hasUserHfToken: !!locals?.user && "hfToken" in locals.user,
        OPENAI_API_KEY: fallbackToken ? "SET" : "NOT_SET"
      },
      "getApiToken (chat-ui-new) called"
    );
  }
  if (useUserToken) {
    const userHfToken = locals?.user?.hfToken;
    if (userHfToken && userHfToken.startsWith("hf_")) {
      return userHfToken;
    }
    if (locals?.token) {
      if (!locals.token.startsWith("hf_")) {
        logger.warn(
          {
            tokenPrefix: locals.token.substring(0, 10)
          },
          "User token does not look like a HuggingFace token, falling back to HF_TOKEN/OPENAI_API_KEY"
        );
      } else {
        return locals.token;
      }
    } else {
      logger.warn("USE_USER_TOKEN is true but no user token found, using fallback");
    }
    return fallbackToken;
  }
  return fallbackToken;
}
export {
  getApiToken as g
};
