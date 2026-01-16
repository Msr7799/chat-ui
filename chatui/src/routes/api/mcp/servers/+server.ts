import type { MCPServer } from "$lib/types/Tool";
import { config } from "$lib/server/config";
import { getLocalMcpConfig } from "$lib/server/mcp/localRegistry";

export async function GET() {
	const mcpServers: MCPServer[] = [];

	// 1. Add remote HTTP MCP servers from MCP_SERVERS env
	const mcpServersEnv = config.MCP_SERVERS || "[]";
	let remoteServers: Array<{ name: string; url: string; headers?: Record<string, string> }> = [];

	try {
		remoteServers = JSON.parse(mcpServersEnv);
		if (!Array.isArray(remoteServers)) {
			remoteServers = [];
		}
	} catch (error) {
		console.error("Failed to parse MCP_SERVERS env variable:", error);
		remoteServers = [];
	}

	// Convert remote servers to client MCPServer format
	for (const server of remoteServers) {
		mcpServers.push({
			id: `remote-${server.name}`,
			name: server.name,
			url: server.url,
			type: "base" as const,
			// headers intentionally omitted
			isLocked: false,
			status: undefined,
		});
	}

	// 2. Add local MCP servers from local config
	try {
		const localConfig = getLocalMcpConfig();
		for (const [name, serverConfig] of Object.entries(localConfig.mcpServers)) {
			mcpServers.push({
				id: `local-${name}`,
				name: name,
				url: `local://${name}`, // Pseudo URL used only to route to local MCP client
				type: "base" as const,
				isLocked: false,
				status: undefined, // Status will be determined by health check
			});
		}
	} catch (error) {
		console.error("Failed to load local MCP servers:", error);
	}

	return Response.json(mcpServers);
}
