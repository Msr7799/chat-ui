import type { McpServerConfig } from "./httpClient";

/**
 * Configuration for a local MCP server that runs via command/args (stdio)
 */
export interface LocalMcpServerConfig {
	command: string;
	args: string[];
	env?: Record<string, string>;
	disabled?: boolean;
	cwd?: string;
}

/**
 * Full local MCP configuration matching Windsurf/VS Code format
 */
export interface LocalMcpConfig {
	mcpServers: Record<string, LocalMcpServerConfig>;
}

/**
 * Unified MCP server type that can be either remote (HTTP) or local (stdio)
 */
export type UnifiedMcpServer =
	| { type: "remote"; name: string; config: McpServerConfig }
	| { type: "local"; name: string; config: LocalMcpServerConfig };

/**
 * MCP server handle for calling tools regardless of type
 */
export interface McpServerHandle {
	name: string;
	type: "remote" | "local";
	callTool(toolName: string, args: unknown): Promise<unknown>;
	listTools(): Promise<Array<{ name: string; description?: string; inputSchema?: unknown }>>;
	close(): Promise<void>;
}
