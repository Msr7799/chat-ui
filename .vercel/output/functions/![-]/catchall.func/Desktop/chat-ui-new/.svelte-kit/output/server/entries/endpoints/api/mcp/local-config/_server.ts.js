import { json, error } from "@sveltejs/kit";
import { a as getLocalMcpConfig, i as importLocalMcpConfig, b as addOrUpdateLocalMcpServer, r as removeLocalMcpServer } from "../../../../../chunks/localRegistry.js";
import { l as logger } from "../../../../../chunks/logger.js";
const GET = async () => {
  try {
    const config = getLocalMcpConfig();
    return json(config);
  } catch (err) {
    logger.error({ err }, "[api] Failed to get local MCP config");
    throw error(500, "Failed to get local MCP configuration");
  }
};
const POST = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || !body.mcpServers) {
      throw error(400, "Invalid configuration format. Expected { mcpServers: {...} }");
    }
    const config = body;
    for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
      if (!serverConfig.command || typeof serverConfig.command !== "string") {
        throw error(
          400,
          `Invalid server config for "${name}": command is required and must be a string`
        );
      }
      if (!Array.isArray(serverConfig.args)) {
        throw error(400, `Invalid server config for "${name}": args must be an array`);
      }
    }
    await importLocalMcpConfig(config);
    logger.info(
      { serverCount: Object.keys(config.mcpServers).length },
      "[api] Successfully imported local MCP config"
    );
    return json({ success: true, message: "Configuration imported successfully" });
  } catch (err) {
    if (err instanceof Response) throw err;
    logger.error({ err }, "[api] Failed to import local MCP config");
    throw error(500, "Failed to import local MCP configuration");
  }
};
const PUT = async ({ request, url }) => {
  try {
    const name = url.searchParams.get("name");
    if (!name) {
      throw error(400, "Server name is required");
    }
    const body = await request.json();
    if (!body.command || typeof body.command !== "string") {
      throw error(400, "command is required and must be a string");
    }
    if (!Array.isArray(body.args)) {
      throw error(400, "args must be an array");
    }
    const serverConfig = body;
    await addOrUpdateLocalMcpServer(name, serverConfig);
    logger.info({ name }, "[api] Successfully added/updated local MCP server");
    return json({ success: true, message: `Server "${name}" added/updated successfully` });
  } catch (err) {
    if (err instanceof Response) throw err;
    logger.error({ err }, "[api] Failed to add/update local MCP server");
    throw error(500, "Failed to add/update local MCP server");
  }
};
const DELETE = async ({ url }) => {
  try {
    const name = url.searchParams.get("name");
    if (!name) {
      throw error(400, "Server name is required");
    }
    await removeLocalMcpServer(name);
    logger.info({ name }, "[api] Successfully removed local MCP server");
    return json({ success: true, message: `Server "${name}" removed successfully` });
  } catch (err) {
    if (err instanceof Response) throw err;
    logger.error({ err }, "[api] Failed to remove local MCP server");
    throw error(500, "Failed to remove local MCP server");
  }
};
export {
  DELETE,
  GET,
  POST,
  PUT
};
