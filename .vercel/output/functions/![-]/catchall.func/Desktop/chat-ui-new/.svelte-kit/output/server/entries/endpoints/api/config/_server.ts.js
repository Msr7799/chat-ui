import { error, json } from "@sveltejs/kit";
import { z } from "zod";
import { c as config } from "../../../../chunks/config.js";
import { l as logger } from "../../../../chunks/logger.js";
const GET = async ({ locals }) => {
  if (!locals.isAdmin) {
    throw error(403, "Admin privileges required");
  }
  return json({
    configManagerEnabled: config.ConfigManagerEnabled,
    geminiApiKeySet: Boolean((config.GEMINI_API_KEY || "").trim()),
    hfTokenSet: Boolean((config.HF_TOKEN || "").trim())
  });
};
const POST = async ({ locals, request }) => {
  if (!locals.isAdmin) {
    throw error(403, "Admin privileges required");
  }
  if (!config.ConfigManagerEnabled) {
    throw error(400, "Config manager is disabled (set ENABLE_CONFIG_MANAGER=true)");
  }
  let body;
  try {
    body = await request.json();
  } catch {
    throw error(400, "Invalid JSON body");
  }
  const parsed = z.object({
    GEMINI_API_KEY: z.string().optional(),
    HF_TOKEN: z.string().optional()
  }).strict().safeParse(body);
  if (!parsed.success) {
    throw error(400, "Invalid payload");
  }
  const updates = parsed.data;
  try {
    if (typeof updates.GEMINI_API_KEY === "string") {
      const v = updates.GEMINI_API_KEY.trim();
      if (v) {
        await config.set("GEMINI_API_KEY", v);
      } else {
        await config.delete("GEMINI_API_KEY");
      }
    }
    if (typeof updates.HF_TOKEN === "string") {
      const v = updates.HF_TOKEN.trim();
      if (v) {
        await config.set("HF_TOKEN", v);
      } else {
        await config.delete("HF_TOKEN");
      }
    }
  } catch (err) {
    logger.error({ err }, "[api/config] Failed to update config");
    throw error(500, "Failed to update config");
  }
  return json({
    success: true,
    geminiApiKeySet: Boolean((config.GEMINI_API_KEY || "").trim()),
    hfTokenSet: Boolean((config.HF_TOKEN || "").trim())
  });
};
export {
  GET,
  POST
};
