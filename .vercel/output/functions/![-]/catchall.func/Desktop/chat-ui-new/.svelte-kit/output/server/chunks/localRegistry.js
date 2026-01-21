import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { l as logger } from "./logger.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
class LocalMcpClient {
  constructor(name, config) {
    this.type = "local";
    this.process = null;
    this.isConnected = false;
    this.name = name;
    this.config = config;
    this.client = new Client(
      {
        name: `chat-ui-local-${name}`,
        version: "1.0.0"
      },
      {
        capabilities: {}
      }
    );
    const cleanEnv = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== void 0) {
        cleanEnv[key] = value;
      }
    }
    this.transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: { ...cleanEnv, ...config.env },
      stderr: "pipe"
    });
  }
  /**
   * Connect to the local MCP server
   */
  async connect() {
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
  async callTool(toolName, args) {
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
        arguments: args
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
  async listTools() {
    if (!this.isConnected) {
      await this.connect();
    }
    try {
      const response = await this.client.listTools();
      return response.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }));
    } catch (error) {
      logger.error({ err: error, name: this.name }, "[mcp-local] Failed to list tools");
      throw error;
    }
  }
  /**
   * Close the connection and terminate the process
   */
  async close() {
    if (!this.isConnected) return;
    try {
      logger.info({ name: this.name }, "[mcp-local] Closing local MCP server connection");
      await this.client.close();
      this.isConnected = false;
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
const LOCAL_MCP_CONFIG_PATH = join(process.cwd(), "mcp.local.config.json");
let cachedConfig = null;
let localClients = /* @__PURE__ */ new Map();
function loadLocalMcpConfig() {
  const envConfig = process.env.MCP_LOCAL_CONFIG;
  if (envConfig) {
    try {
      const parsed = JSON.parse(envConfig);
      logger.info("[mcp-local] Loaded local MCP config from MCP_LOCAL_CONFIG env");
      return parsed;
    } catch (error) {
      logger.warn({ err: error }, "[mcp-local] Failed to parse MCP_LOCAL_CONFIG env");
    }
  }
  if (existsSync(LOCAL_MCP_CONFIG_PATH)) {
    try {
      const fileContent = readFileSync(LOCAL_MCP_CONFIG_PATH, "utf-8");
      const parsed = JSON.parse(fileContent);
      logger.info({ path: LOCAL_MCP_CONFIG_PATH }, "[mcp-local] Loaded local MCP config from file");
      return parsed;
    } catch (error) {
      logger.warn(
        { err: error, path: LOCAL_MCP_CONFIG_PATH },
        "[mcp-local] Failed to load local MCP config from file"
      );
    }
  }
  logger.info("[mcp-local] No local MCP config found, using empty config");
  return { mcpServers: {} };
}
function saveLocalMcpConfig(newConfig) {
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
async function initLocalMcpServers() {
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
function getLocalMcpClient(name) {
  return localClients.get(name);
}
async function callLocalMcpTool(name, tool, args = {}, { timeoutMs, signal } = {}) {
  const client = localClients.get(name);
  if (!client) {
    throw new Error(`Local MCP server "${name}" is not available`);
  }
  const normalizedArgs = typeof args === "object" && args !== null && !Array.isArray(args) ? args : void 0;
  const response = await client.callTool(tool, normalizedArgs ?? {});
  const anyResp = response;
  const parts = Array.isArray(anyResp?.content) ? anyResp.content : [];
  const textParts = parts.filter((part) => {
    if (typeof part !== "object" || part === null) return false;
    const obj = part;
    return obj["type"] === "text" && typeof obj["text"] === "string";
  }).map((p) => p.text);
  const text = textParts.join("\n");
  const structured = anyResp?.structuredContent;
  const contentBlocks = Array.isArray(anyResp?.content) ? anyResp.content : void 0;
  return { text, structured, content: contentBlocks };
}
async function addOrUpdateLocalMcpServer(name, serverConfig) {
  if (!cachedConfig) {
    cachedConfig = loadLocalMcpConfig();
  }
  const existingClient = localClients.get(name);
  if (existingClient) {
    await existingClient.close();
    localClients.delete(name);
  }
  cachedConfig.mcpServers[name] = serverConfig;
  saveLocalMcpConfig(cachedConfig);
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
async function removeLocalMcpServer(name) {
  if (!cachedConfig) {
    cachedConfig = loadLocalMcpConfig();
  }
  const client = localClients.get(name);
  if (client) {
    await client.close();
    localClients.delete(name);
  }
  delete cachedConfig.mcpServers[name];
  saveLocalMcpConfig(cachedConfig);
  logger.info({ name }, "[mcp-local] Successfully removed local MCP server");
}
async function importLocalMcpConfig(newConfig) {
  logger.info(
    { serverCount: Object.keys(newConfig.mcpServers).length },
    "[mcp-local] Importing new local MCP config"
  );
  for (const [name, client] of localClients.entries()) {
    await client.close();
    logger.info({ name }, "[mcp-local] Closed existing client during import");
  }
  localClients.clear();
  saveLocalMcpConfig(newConfig);
  await initLocalMcpServers();
  logger.info("[mcp-local] Local MCP config import complete");
}
function getLocalMcpConfig() {
  if (!cachedConfig) {
    cachedConfig = loadLocalMcpConfig();
  }
  return cachedConfig;
}
async function cleanupLocalMcpServers() {
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
export {
  getLocalMcpConfig as a,
  addOrUpdateLocalMcpServer as b,
  callLocalMcpTool as c,
  initLocalMcpServers as d,
  cleanupLocalMcpServers as e,
  getLocalMcpClient as g,
  importLocalMcpConfig as i,
  removeLocalMcpServer as r
};
