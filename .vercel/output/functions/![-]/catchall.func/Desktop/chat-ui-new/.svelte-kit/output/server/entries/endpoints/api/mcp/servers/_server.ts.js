import { c as config } from "../../../../../chunks/config.js";
import { a as getLocalMcpConfig } from "../../../../../chunks/localRegistry.js";
async function GET() {
  const mcpServers = [];
  const mcpServersEnv = config.MCP_SERVERS || "[]";
  let remoteServers = [];
  try {
    remoteServers = JSON.parse(mcpServersEnv);
    if (!Array.isArray(remoteServers)) {
      remoteServers = [];
    }
  } catch (error) {
    console.error("Failed to parse MCP_SERVERS env variable:", error);
    remoteServers = [];
  }
  for (const server of remoteServers) {
    mcpServers.push({
      id: `remote-${server.name}`,
      name: server.name,
      url: server.url,
      type: "base",
      // headers intentionally omitted
      isLocked: false,
      status: void 0
    });
  }
  try {
    const localConfig = getLocalMcpConfig();
    for (const [name, serverConfig] of Object.entries(localConfig.mcpServers)) {
      mcpServers.push({
        id: `local-${name}`,
        name,
        url: `local://${name}`,
        // Pseudo URL used only to route to local MCP client
        type: "base",
        isLocked: false,
        status: void 0
        // Status will be determined by health check
      });
    }
  } catch (error) {
    console.error("Failed to load local MCP servers:", error);
  }
  return Response.json(mcpServers);
}
export {
  GET
};
