import { S as Semaphores, c as config, r as ready } from "./config.js";
import { Database, collections } from "./database.js";
import { b as base } from "./server.js";
import "@sveltejs/kit/internal/server";
import { b as authenticateRequest, l as loginEnabled, r as refreshSessionCookie, t as triggerOauthFlow } from "./auth.js";
import { E as ERROR_MESSAGES } from "./errors.js";
import { addWeeks } from "date-fns";
import { a as acquireLock, i as isDBLocked, b as refreshLock, r as releaseLock } from "./lock.js";
import { l as logger } from "./logger.js";
import { b as building } from "./environment.js";
import { l as loadMcpServersOnStartup, A as AbortedGenerations } from "./registry.js";
import { i as initExitHandler, o as onExit } from "./exitHandler.js";
import { r as refreshConversationStats } from "./refresh-conversation-stats.js";
import { a as adminTokenManager } from "./adminToken.js";
import "ip-address";
import { isIP } from "node:net";
import { M as MetricsServer } from "./metrics.js";
import { d as initLocalMcpServers, e as cleanupLocalMcpServers } from "./localRegistry.js";
const migrations = [];
async function checkAndRunMigrations() {
  if (new Set(migrations.map((m) => m._id.toString())).size !== migrations.length) {
    throw new Error("Duplicate migration GUIDs found.");
  }
  const migrationResults = await (await Database.getInstance()).getCollections().migrationResults.find().toArray();
  logger.debug("[MIGRATIONS] Begin check...");
  const connectedClient = await (await Database.getInstance()).getClient().connect();
  const lockId = await acquireLock(Semaphores.MIGRATION);
  if (!lockId) {
    logger.debug(
      "[MIGRATIONS] Another instance already has the lock. Waiting for DB to be unlocked."
    );
    while (await isDBLocked(Semaphores.MIGRATION)) {
      await new Promise((resolve) => setTimeout(resolve, 1e3));
    }
    return;
  }
  const refreshInterval = setInterval(async () => {
    await refreshLock(Semaphores.MIGRATION, lockId);
  }, 1e3 * 10);
  for (const migration of migrations) {
    const shouldRun = migration.runEveryTime || !migrationResults.find((m) => m._id.toString() === migration._id.toString());
    if (!shouldRun) {
      logger.debug(`[MIGRATIONS] "${migration.name}" already applied. Skipping...`);
    } else {
      if (migration.runForHuggingChat === "only" && !config.isHuggingChat || migration.runForHuggingChat === "never" && config.isHuggingChat) {
        logger.debug(
          `[MIGRATIONS] "${migration.name}" should not be applied for this run. Skipping...`
        );
        continue;
      }
      logger.debug(
        `[MIGRATIONS] "${migration.name}" ${migration.runEveryTime ? "should run every time" : "not applied yet"}. Applying...`
      );
      await (await Database.getInstance()).getCollections().migrationResults.updateOne(
        { _id: migration._id },
        {
          $set: {
            name: migration.name,
            status: "ongoing"
          }
        },
        { upsert: true }
      );
      const session = connectedClient.startSession();
      let result = false;
      try {
        await session.withTransaction(async () => {
          result = await migration.up(await Database.getInstance());
        });
      } catch (e) {
        logger.debug(`[MIGRATIONS]  "${migration.name}" failed!`);
        logger.error(e);
      } finally {
        await session.endSession();
      }
      await (await Database.getInstance()).getCollections().migrationResults.updateOne(
        { _id: migration._id },
        {
          $set: {
            name: migration.name,
            status: result ? "success" : "failure"
          }
        },
        { upsert: true }
      );
    }
  }
  logger.debug("[MIGRATIONS] All migrations applied. Releasing lock");
  clearInterval(refreshInterval);
  await releaseLock(Semaphores.MIGRATION, lockId);
}
function isHostLocalhost(host) {
  if (host === "localhost") return true;
  if (host === "::1" || host === "[::1]") return true;
  if (host.startsWith("127.") && isIP(host)) return true;
  if (host.endsWith(".localhost")) return true;
  return false;
}
const init = async () => {
  await ready;
  if (!building) {
    const canonicalToken = config.OPENAI_API_KEY || config.HF_TOKEN;
    if (canonicalToken) {
      process.env.HF_TOKEN ??= canonicalToken;
    }
    if (!config.OPENAI_API_KEY && config.HF_TOKEN) {
      logger.warn(
        "HF_TOKEN is deprecated in favor of OPENAI_API_KEY. Please migrate to OPENAI_API_KEY."
      );
    }
    logger.info("Starting server...");
    initExitHandler();
    if (config.METRICS_ENABLED === "true") {
      MetricsServer.getInstance();
    }
    checkAndRunMigrations();
    refreshConversationStats();
    loadMcpServersOnStartup();
    try {
      await initLocalMcpServers();
      onExit(async () => {
        await cleanupLocalMcpServers();
      });
    } catch (error) {
      logger.error({ err: error }, "Failed to initialize local MCP servers");
    }
    AbortedGenerations.getInstance();
    adminTokenManager.displayToken();
    if (config.EXPOSE_API) {
      logger.warn(
        "The EXPOSE_API flag has been deprecated. The API is now required for chat-ui to work."
      );
    }
  }
};
const handleError = async ({ error, event, status, message }) => {
  if (building) {
    throw error;
  }
  if (event.route.id === null) {
    return {
      message: `Page ${event.url.pathname} not found`
    };
  }
  const errorId = crypto.randomUUID();
  logger.error({
    locals: event.locals,
    url: event.request.url,
    params: event.params,
    request: event.request,
    message,
    error,
    errorId,
    status,
    stack: error instanceof Error ? error.stack : void 0
  });
  return {
    message: "An error occurred",
    errorId
  };
};
const handle = async ({ event, resolve }) => {
  await ready.then(() => {
    config.checkForUpdates();
  });
  logger.debug({
    locals: event.locals,
    url: event.url.pathname,
    params: event.params,
    request: event.request
  });
  function errorResponse(status, message) {
    const sendJson = event.request.headers.get("accept")?.includes("application/json") || event.request.headers.get("content-type")?.includes("application/json");
    return new Response(sendJson ? JSON.stringify({ error: message }) : message, {
      status,
      headers: {
        "content-type": sendJson ? "application/json" : "text/plain"
      }
    });
  }
  if (event.url.pathname.startsWith(`${base}/admin/`) || event.url.pathname === `${base}/admin`) {
    const ADMIN_SECRET = config.ADMIN_API_SECRET || config.PARQUET_EXPORT_SECRET;
    if (!ADMIN_SECRET) {
      return errorResponse(500, "Admin API is not configured");
    }
    if (event.request.headers.get("Authorization") !== `Bearer ${ADMIN_SECRET}`) {
      return errorResponse(401, "Unauthorized");
    }
  }
  const auth = await authenticateRequest(
    { type: "svelte", value: event.request.headers },
    { type: "svelte", value: event.cookies },
    event.url
  );
  event.locals.sessionId = auth.sessionId;
  if (loginEnabled && !auth.user && !event.url.pathname.startsWith(`${base}/.well-known/`)) {
    if (config.AUTOMATIC_LOGIN === "true") {
      if (!event.url.pathname.startsWith(`${base}/login`) && !event.url.pathname.startsWith(`${base}/healthcheck`)) {
        refreshSessionCookie(event.cookies, auth.secretSessionId);
        return await triggerOauthFlow(event);
      }
    } else {
      if (event.url.pathname !== `${base}/` && event.url.pathname !== `${base}` && !event.url.pathname.startsWith(`${base}/login`) && !event.url.pathname.startsWith(`${base}/login/callback`) && !event.url.pathname.startsWith(`${base}/healthcheck`) && !event.url.pathname.startsWith(`${base}/r/`) && !event.url.pathname.startsWith(`${base}/conversation/`) && !event.url.pathname.startsWith(`${base}/models/`) && !event.url.pathname.startsWith(`${base}/api`)) {
        refreshSessionCookie(event.cookies, auth.secretSessionId);
        return triggerOauthFlow(event);
      }
    }
  }
  event.locals.user = auth.user || void 0;
  event.locals.token = auth.token;
  event.locals.isAdmin = event.locals.user?.isAdmin || adminTokenManager.isAdmin(event.locals.sessionId);
  const requestContentType = event.request.headers.get("content-type")?.split(";")[0] ?? "";
  const nativeFormContentTypes = [
    "multipart/form-data",
    "application/x-www-form-urlencoded",
    "text/plain"
  ];
  if (event.request.method === "POST") {
    if (nativeFormContentTypes.includes(requestContentType)) {
      const origin = event.request.headers.get("origin");
      if (!origin) {
        return errorResponse(403, "Non-JSON form requests need to have an origin");
      }
      const validOrigins = [
        new URL(event.request.url).host,
        ...config.PUBLIC_ORIGIN ? [new URL(config.PUBLIC_ORIGIN).host] : []
      ];
      if (!validOrigins.includes(new URL(origin).host)) {
        return errorResponse(403, "Invalid referer for POST request");
      }
    }
  }
  if (event.request.method === "POST" || event.url.pathname.startsWith(`${base}/login`) || event.url.pathname.startsWith(`${base}/login/callback`)) {
    refreshSessionCookie(event.cookies, auth.secretSessionId);
    await collections.sessions.updateOne(
      { sessionId: auth.sessionId },
      { $set: { updatedAt: /* @__PURE__ */ new Date(), expiresAt: addWeeks(/* @__PURE__ */ new Date(), 2) } }
    );
  }
  if (loginEnabled && !event.locals.user && !event.url.pathname.startsWith(`${base}/login`) && !event.url.pathname.startsWith(`${base}/admin`) && !event.url.pathname.startsWith(`${base}/settings`) && !["GET", "OPTIONS", "HEAD"].includes(event.request.method)) {
    return errorResponse(401, ERROR_MESSAGES.authOnly);
  }
  let replaced = false;
  const response = await resolve(event, {
    transformPageChunk: (chunk) => {
      if (replaced || !chunk.html.includes("%gaId%")) {
        return chunk.html;
      }
      replaced = true;
      return chunk.html.replace("%gaId%", config.PUBLIC_GOOGLE_ANALYTICS_ID);
    },
    filterSerializedResponseHeaders: (header) => {
      return header.includes("content-type");
    }
  });
  if (config.ALLOW_IFRAME !== "true") {
    response.headers.append("Content-Security-Policy", "frame-ancestors 'none';");
  }
  if (event.url.pathname.startsWith(`${base}/login/callback`) || event.url.pathname.startsWith(`${base}/login`)) {
    response.headers.append("Cache-Control", "no-store");
  }
  if (event.url.pathname.startsWith(`${base}/api/`)) {
    const requestOrigin = event.request.headers.get("origin");
    let allowedOrigin = config.PUBLIC_ORIGIN ? new URL(config.PUBLIC_ORIGIN).origin : void 0;
    if (
      // if we're in dev mode
      !requestOrigin || // or the origin is null (SSR)
      isHostLocalhost(new URL(requestOrigin).hostname)
    ) {
      allowedOrigin = "*";
    } else if (allowedOrigin === requestOrigin) {
      allowedOrigin = requestOrigin;
    }
    if (allowedOrigin) {
      response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS"
      );
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }
  }
  return response;
};
const handleFetch = async ({ event, request, fetch }) => {
  if (isHostLocalhost(new URL(request.url).hostname)) {
    const cookieHeader = event.request.headers.get("cookie");
    if (cookieHeader) {
      const headers = new Headers(request.headers);
      headers.set("cookie", cookieHeader);
      return fetch(new Request(request, { headers }));
    }
  }
  return fetch(request);
};
export {
  handle,
  handleError,
  handleFetch,
  init
};
