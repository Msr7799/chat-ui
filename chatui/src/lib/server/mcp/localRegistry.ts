import { readFileSync, existsSync, writeFileSync } from "fs";
import { join } from "path";
import { logger } from "$lib/server/logger";
import type { LocalMcpConfig, LocalMcpServerConfig } from "./types";
import { LocalMcpClient } from "./localClient";
import type { McpToolTextResponse } from "./httpClient";

const LOCAL_MCP_CONFIG_PATH = join(process.cwd(), "mcp.local.config.json");

let cachedConfig: LocalMcpConfig | null = null;
let localClients: Map<string, LocalMcpClient> = new Map();

/**
 * Load local MCP configuration from file or environment variable
 */
function loadLocalMcpConfig(): LocalMcpConfig {
	// Try to load from environment variable first
	const envConfig = process.env.MCP_LOCAL_CONFIG;
	if (envConfig) {
		try {
			const parsed = JSON.parse(envConfig);
			logger.info("[mcp-local] Loaded local MCP config from MCP_LOCAL_CONFIG env");
			return parsed as LocalMcpConfig;
		} catch (error) {
			logger.warn({ err: error }, "[mcp-local] Failed to parse MCP_LOCAL_CONFIG env");
		}
	}

	// Try to load from file
	if (existsSync(LOCAL_MCP_CONFIG_PATH)) {
		try {
			const fileContent = readFileSync(LOCAL_MCP_CONFIG_PATH, "utf-8");
			const parsed = JSON.parse(fileContent);
			logger.info({ path: LOCAL_MCP_CONFIG_PATH }, "[mcp-local] Loaded local MCP config from file");
			return parsed as LocalMcpConfig;
		} catch (error) {
			logger.warn(
				{ err: error, path: LOCAL_MCP_CONFIG_PATH },
				"[mcp-local] Failed to load local MCP config from file"
			);
		}
	}

	// Return empty config if nothing found
	logger.info("[mcp-local] No local MCP config found, using empty config");
	return { mcpServers: {} };
}

/**
 * Save local MCP configuration to file
 */
export function saveLocalMcpConfig(newConfig: LocalMcpConfig): void {
	try {
		writeFileSync(LOCAL_MCP_CONFIG_PATH, JSON.stringify(newConfig, null, 2), "utf-8");
		cachedConfig = newConfig;
		logger.info({ path: LOCAL_MCP_CONFIG_PATH }, "[mcp-local] Saved local MCP config to file");
	} catch (error) {
		logger.error(
			{ err: error, path: LOCAL_MCP_CONFIG_PATH },
			"[mcp-local] Failed to save local MCP config"
		);
		throw error;
	}
}

/**
 * Initialize all local MCP servers on startup
 */
export async function initLocalMcpServers(): Promise<void> {
	cachedConfig = loadLocalMcpConfig();

	const serverNames = Object.keys(cachedConfig.mcpServers);
	logger.info(
		{ count: serverNames.length, servers: serverNames },
		"[mcp-local] Initializing local MCP servers"
	);

	for (const [name, serverConfig] of Object.entries(cachedConfig.mcpServers)) {
		if (serverConfig.disabled) {
			logger.info({ name }, "[mcp-local] Skipping disabled server");
			continue;
		}

		try {
			const client = new LocalMcpClient(name, serverConfig);
			await client.connect();
			localClients.set(name, client);
			logger.info({ name }, "[mcp-local] Successfully initialized local MCP server");
		} catch (error) {
			logger.error({ err: error, name }, "[mcp-local] Failed to initialize local MCP server");
		}
	}

	logger.info(
		{ active: localClients.size, total: serverNames.length },
		"[mcp-local] Local MCP servers initialization complete"
	);
}

/**
 * Get all active local MCP clients
 */
export function getLocalMcpClients(): Map<string, LocalMcpClient> {
	return localClients;
}

/**
 * Get a specific local MCP client by name
 */
export function getLocalMcpClient(name: string): LocalMcpClient | undefined {
	return localClients.get(name);
}

/**
 * Call a tool on a local MCP server by name.
 * Returns the same McpToolTextResponse shape as HTTP MCP calls so the
 * higher-level toolInvocation logic can remain unified.
 */
export async function callLocalMcpTool(
	name: string,
	tool: string,
	args: unknown = {},
	{ timeoutMs, signal }: { timeoutMs?: number; signal?: AbortSignal } = {}
): Promise<McpToolTextResponse> {
	const client = localClients.get(name);
	if (!client) {
		throw new Error(`Local MCP server \"${name}\" is not available`);
	}

	const normalizedArgs =
		typeof args === "object" && args !== null && !Array.isArray(args)
			? (args as Record<string, unknown>)
			: undefined;

	// LocalMcpClient.callTool returns the raw MCP response. We mirror the
	// httpClient callMcpTool behavior by extracting text parts from
	// response.content.
	const response = (await client.callTool(tool, normalizedArgs ?? {})) as unknown;
	const anyResp = response as { content?: unknown; structuredContent?: unknown };
	const parts = Array.isArray(anyResp?.content) ? (anyResp.content as Array<unknown>) : [];
	const textParts = parts
		.filter((part): part is { type: "text"; text: string } => {
			if (typeof part !== "object" || part === null) return false;
			const obj = part as Record<string, unknown>;
			return obj["type"] === "text" && typeof obj["text"] === "string";
		})
		.map((p) => p.text);

	const text = textParts.join("\n");
	const structured = anyResp?.structuredContent;
	const contentBlocks = Array.isArray(anyResp?.content)
		? (anyResp.content as unknown[])
		: undefined;
	return { text, structured, content: contentBlocks };
}

/**
 * Add or update a local MCP server
 */
export async function addOrUpdateLocalMcpServer(
	name: string,
	serverConfig: LocalMcpServerConfig
): Promise<void> {
	if (!cachedConfig) {
		cachedConfig = loadLocalMcpConfig();
	}

	// Close existing client if any
	const existingClient = localClients.get(name);
	if (existingClient) {
		await existingClient.close();
		localClients.delete(name);
	}

	// Update config
	cachedConfig.mcpServers[name] = serverConfig;
	saveLocalMcpConfig(cachedConfig);

	// Start new client if not disabled
	if (!serverConfig.disabled) {
		try {
			const client = new LocalMcpClient(name, serverConfig);
			await client.connect();
			localClients.set(name, client);
			logger.info({ name }, "[mcp-local] Successfully added/updated local MCP server");
		} catch (error) {
			logger.error({ err: error, name }, "[mcp-local] Failed to start local MCP server");
			throw error;
		}
	}
}

/**
 * Remove a local MCP server
 */
export async function removeLocalMcpServer(name: string): Promise<void> {
	if (!cachedConfig) {
		cachedConfig = loadLocalMcpConfig();
	}

	// Close client if running
	const client = localClients.get(name);
	if (client) {
		await client.close();
		localClients.delete(name);
	}

	// Remove from config
	delete cachedConfig.mcpServers[name];
	saveLocalMcpConfig(cachedConfig);

	logger.info({ name }, "[mcp-local] Successfully removed local MCP server");
}

/**
 * Import a full local MCP configuration (replaces existing)
 */
export async function importLocalMcpConfig(newConfig: LocalMcpConfig): Promise<void> {
	logger.info(
		{ serverCount: Object.keys(newConfig.mcpServers).length },
		"[mcp-local] Importing new local MCP config"
	);

	// Close all existing clients
	for (const [name, client] of localClients.entries()) {
		await client.close();
		logger.info({ name }, "[mcp-local] Closed existing client during import");
	}
	localClients.clear();

	// Save new config
	saveLocalMcpConfig(newConfig);

	// Initialize new servers
	await initLocalMcpServers();

	logger.info("[mcp-local] Local MCP config import complete");
}

/**
 * Get current local MCP configuration
 */
export function getLocalMcpConfig(): LocalMcpConfig {
	if (!cachedConfig) {
		cachedConfig = loadLocalMcpConfig();
	}
	return cachedConfig;
}

/**
 * Cleanup all local MCP servers (call on shutdown)
 */
export async function cleanupLocalMcpServers(): Promise<void> {
	logger.info({ count: localClients.size }, "[mcp-local] Cleaning up local MCP servers");

	for (const [name, client] of localClients.entries()) {
		try {
			await client.close();
			logger.info({ name }, "[mcp-local] Closed local MCP server");
		} catch (error) {
			logger.error({ err: error, name }, "[mcp-local] Error closing local MCP server");
		}
	}

	localClients.clear();
	logger.info("[mcp-local] Local MCP servers cleanup complete");
}
