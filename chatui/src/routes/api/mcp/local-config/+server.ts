import { json, error as svelteError, type RequestHandler } from "@sveltejs/kit";
import {
	getLocalMcpConfig,
	importLocalMcpConfig,
	addOrUpdateLocalMcpServer,
	removeLocalMcpServer,
} from "$lib/server/mcp/localRegistry";
import type { LocalMcpConfig, LocalMcpServerConfig } from "$lib/server/mcp/types";
import { logger } from "$lib/server/logger";

/**
 * GET /api/mcp/local-config
 * Returns the current local MCP configuration
 */
export const GET: RequestHandler = async () => {
	try {
		const config = getLocalMcpConfig();
		return json(config);
	} catch (err) {
		logger.error({ err }, "[api] Failed to get local MCP config");
		throw svelteError(500, "Failed to get local MCP configuration");
	}
};

/**
 * POST /api/mcp/local-config
 * Import a full local MCP configuration (replaces existing)
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		// Validate the structure
		if (!body || typeof body !== "object" || !body.mcpServers) {
			throw svelteError(400, "Invalid configuration format. Expected { mcpServers: {...} }");
		}

		const config = body as LocalMcpConfig;

		// Validate each server config
		for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
			if (!serverConfig.command || typeof serverConfig.command !== "string") {
				throw svelteError(
					400,
					`Invalid server config for "${name}": command is required and must be a string`
				);
			}
			if (!Array.isArray(serverConfig.args)) {
				throw svelteError(400, `Invalid server config for "${name}": args must be an array`);
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
		throw svelteError(500, "Failed to import local MCP configuration");
	}
};

/**
 * PUT /api/mcp/local-config/:name
 * Add or update a single local MCP server
 */
export const PUT: RequestHandler = async ({ request, url }) => {
	try {
		const name = url.searchParams.get("name");
		if (!name) {
			throw svelteError(400, "Server name is required");
		}

		const body = await request.json();

		// Validate server config
		if (!body.command || typeof body.command !== "string") {
			throw svelteError(400, "command is required and must be a string");
		}
		if (!Array.isArray(body.args)) {
			throw svelteError(400, "args must be an array");
		}

		const serverConfig = body as LocalMcpServerConfig;

		await addOrUpdateLocalMcpServer(name, serverConfig);

		logger.info({ name }, "[api] Successfully added/updated local MCP server");

		return json({ success: true, message: `Server "${name}" added/updated successfully` });
	} catch (err) {
		if (err instanceof Response) throw err;
		logger.error({ err }, "[api] Failed to add/update local MCP server");
		throw svelteError(500, "Failed to add/update local MCP server");
	}
};

/**
 * DELETE /api/mcp/local-config/:name
 * Remove a local MCP server
 */
export const DELETE: RequestHandler = async ({ url }) => {
	try {
		const name = url.searchParams.get("name");
		if (!name) {
			throw svelteError(400, "Server name is required");
		}

		await removeLocalMcpServer(name);

		logger.info({ name }, "[api] Successfully removed local MCP server");

		return json({ success: true, message: `Server "${name}" removed successfully` });
	} catch (err) {
		if (err instanceof Response) throw err;
		logger.error({ err }, "[api] Failed to remove local MCP server");
		throw svelteError(500, "Failed to remove local MCP server");
	}
};
