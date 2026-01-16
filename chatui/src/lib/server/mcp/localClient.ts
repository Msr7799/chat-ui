import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn, type ChildProcess } from "child_process";
import { logger } from "$lib/server/logger";
import type { LocalMcpServerConfig, McpServerHandle } from "./types";

/**
 * Local MCP client that communicates with a server via stdio (command/args)
 */
export class LocalMcpClient implements McpServerHandle {
	name: string;
	type: "local" = "local";
	private client: Client;
	private transport: StdioClientTransport;
	private process: ChildProcess | null = null;
	private config: LocalMcpServerConfig;
	private isConnected = false;

	constructor(name: string, config: LocalMcpServerConfig) {
		this.name = name;
		this.config = config;
		this.client = new Client(
			{
				name: `chat-ui-local-${name}`,
				version: "1.0.0",
			},
			{
				capabilities: {},
			}
		);
		// Filter out undefined values from process.env
		const cleanEnv: Record<string, string> = {};
		for (const [key, value] of Object.entries(process.env)) {
			if (value !== undefined) {
				cleanEnv[key] = value;
			}
		}

		this.transport = new StdioClientTransport({
			command: config.command,
			args: config.args,
			env: { ...cleanEnv, ...config.env },
			stderr: "pipe",
		});
	}

	/**
	 * Connect to the local MCP server
	 */
	async connect(): Promise<void> {
		if (this.isConnected) return;

		try {
			logger.info(
				{ name: this.name, command: this.config.command, args: this.config.args },
				"[mcp-local] Connecting to local MCP server"
			);

			await this.client.connect(this.transport);
			this.isConnected = true;

			logger.info({ name: this.name }, "[mcp-local] Successfully connected");
		} catch (error) {
			logger.error(
				{ err: error, name: this.name },
				"[mcp-local] Failed to connect to local MCP server"
			);
			throw error;
		}
	}

	/**
	 * Call a tool on the local MCP server
	 */
	async callTool(toolName: string, args: unknown): Promise<unknown> {
		if (!this.isConnected) {
			await this.connect();
		}

		try {
			logger.debug(
				{ name: this.name, toolName, args },
				"[mcp-local] Calling tool on local MCP server"
			);

			const result = await this.client.callTool({
				name: toolName,
				arguments: args as Record<string, unknown>,
			});

			logger.debug({ name: this.name, toolName, result }, "[mcp-local] Tool call successful");

			return result;
		} catch (error) {
			logger.error({ err: error, name: this.name, toolName }, "[mcp-local] Tool call failed");
			throw error;
		}
	}

	/**
	 * List available tools from the local MCP server
	 */
	async listTools(): Promise<Array<{ name: string; description?: string; inputSchema?: unknown }>> {
		if (!this.isConnected) {
			await this.connect();
		}

		try {
			const response = await this.client.listTools();
			return response.tools.map((tool) => ({
				name: tool.name,
				description: tool.description,
				inputSchema: tool.inputSchema,
			}));
		} catch (error) {
			logger.error({ err: error, name: this.name }, "[mcp-local] Failed to list tools");
			throw error;
		}
	}

	/**
	 * Close the connection and terminate the process
	 */
	async close(): Promise<void> {
		if (!this.isConnected) return;

		try {
			logger.info({ name: this.name }, "[mcp-local] Closing local MCP server connection");

			await this.client.close();
			this.isConnected = false;

			// Give the process a moment to exit gracefully
			await new Promise((resolve) => setTimeout(resolve, 100));

			if (this.process && !this.process.killed) {
				this.process.kill();
			}

			logger.info({ name: this.name }, "[mcp-local] Local MCP server connection closed");
		} catch (error) {
			logger.error({ err: error, name: this.name }, "[mcp-local] Error closing local MCP server");
		}
	}
}
