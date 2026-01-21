import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { c as config } from "../../../../../chunks/config.js";
import { i as isValidUrl } from "../../../../../chunks/urlSafety.js";
import { i as isStrictHfMcpLogin, h as hasNonEmptyToken } from "../../../../../chunks/hf.js";
import { g as getLocalMcpClient } from "../../../../../chunks/localRegistry.js";
const POST = async ({ request, locals }) => {
  let client;
  try {
    const body = await request.json();
    const { url, headers } = body;
    if (!url) {
      return new Response(JSON.stringify({ ready: false, error: "URL is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (url.startsWith("local://")) {
      const name = url.slice("local://".length) || "";
      const client2 = getLocalMcpClient(name);
      if (!client2) {
        const res2 = new Response(
          JSON.stringify({
            ready: false,
            error: `Local MCP server "${name}" is not available. Make sure it is configured and initialized.`
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" }
          }
        );
        return res2;
      }
      try {
        const tools = await client2.listTools();
        const res2 = new Response(
          JSON.stringify({
            ready: true,
            tools
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        );
        return res2;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const res2 = new Response(
          JSON.stringify({
            ready: false,
            error: message
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" }
          }
        );
        return res2;
      }
    }
    if (!isValidUrl(url)) {
      return new Response(
        JSON.stringify({
          ready: false,
          error: "Invalid or unsafe URL (only HTTPS is supported)"
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const baseUrl = new URL(url);
    const headersRecord = headers?.length ? Object.fromEntries(headers.map((h) => [h.key, h.value])) : {};
    if (!headersRecord["Accept"]) {
      headersRecord["Accept"] = "application/json, text/event-stream";
    }
    try {
      const shouldForward = config.MCP_FORWARD_HF_USER_TOKEN === "true";
      const userToken = locals?.hfAccessToken ?? locals?.token;
      const hasAuth = typeof headersRecord["Authorization"] === "string";
      const isHfMcpTarget = isStrictHfMcpLogin(url);
      if (shouldForward && !hasAuth && isHfMcpTarget && hasNonEmptyToken(userToken)) {
        headersRecord["Authorization"] = `Bearer ${userToken}`;
      }
    } catch {
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3e4);
    const signal = controller.signal;
    const requestInit = {
      headers: headersRecord,
      signal
    };
    let httpError;
    let lastError;
    try {
      console.log(`[MCP Health] Trying HTTP transport for ${url}`);
      client = new Client({
        name: "chat-ui-health-check",
        version: "1.0.0"
      });
      const transport = new StreamableHTTPClientTransport(baseUrl, { requestInit });
      console.log(`[MCP Health] Connecting to ${url}...`);
      await client.connect(transport);
      console.log(`[MCP Health] Connected successfully via HTTP`);
      const toolsResponse = await client.listTools();
      await client.close();
      if (toolsResponse && toolsResponse.tools) {
        const response = {
          ready: true,
          tools: toolsResponse.tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema
          })),
          authRequired: false
        };
        const res2 = new Response(JSON.stringify(response), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
        clearTimeout(timeoutId);
        return res2;
      } else {
        const res2 = new Response(
          JSON.stringify({
            ready: false,
            error: "Connected but no tools available",
            authRequired: false
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" }
          }
        );
        clearTimeout(timeoutId);
        return res2;
      }
    } catch (error) {
      httpError = error instanceof Error ? error : new Error(String(error));
      lastError = httpError;
      console.log("Streamable HTTP failed, trying SSE transport...", lastError.message);
      try {
        await client?.close();
      } catch {
      }
      try {
        console.log(`[MCP Health] Trying SSE transport for ${url}`);
        client = new Client({
          name: "chat-ui-health-check",
          version: "1.0.0"
        });
        const sseTransport = new SSEClientTransport(baseUrl, { requestInit });
        console.log(`[MCP Health] Connecting via SSE...`);
        await client.connect(sseTransport);
        console.log(`[MCP Health] Connected successfully via SSE`);
        const toolsResponse = await client.listTools();
        await client.close();
        if (toolsResponse && toolsResponse.tools) {
          const response = {
            ready: true,
            tools: toolsResponse.tools.map((tool) => ({
              name: tool.name,
              description: tool.description,
              inputSchema: tool.inputSchema
            })),
            authRequired: false
          };
          const res2 = new Response(JSON.stringify(response), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
          clearTimeout(timeoutId);
          return res2;
        } else {
          const res2 = new Response(
            JSON.stringify({
              ready: false,
              error: "Connected but no tools available",
              authRequired: false
            }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" }
            }
          );
          clearTimeout(timeoutId);
          return res2;
        }
      } catch (sseError) {
        lastError = sseError instanceof Error ? sseError : new Error(String(sseError));
        if (httpError) {
          lastError = new Error(
            `HTTP transport failed: ${httpError.message}; SSE fallback failed: ${lastError.message}`,
            { cause: sseError instanceof Error ? sseError : void 0 }
          );
        }
        console.error("Both transports failed. Last error:", lastError);
      }
    }
    let errorMessage = lastError?.message || "Failed to connect to MCP server";
    const lower = (errorMessage || "").toLowerCase();
    const authRequired = lower.includes("unauthorized") || lower.includes("forbidden") || lower.includes("401") || lower.includes("403");
    if (authRequired) {
      errorMessage = "Authentication required. Provide appropriate Authorization headers in the server configuration.";
    } else if (errorMessage.includes("not valid JSON")) {
      errorMessage = "Server returned invalid response. This might not be a valid MCP endpoint. MCP servers should respond to POST requests at /mcp with JSON-RPC messages.";
    } else if (errorMessage.includes("fetch failed") || errorMessage.includes("ECONNREFUSED")) {
      errorMessage = `Cannot connect to ${url}. Please verify the server is running and accessible.`;
    } else if (errorMessage.includes("CORS")) {
      errorMessage = `CORS error. The MCP server needs to allow requests from this origin.`;
    }
    const res = new Response(
      JSON.stringify({
        ready: false,
        error: errorMessage,
        authRequired
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" }
      }
    );
    clearTimeout(timeoutId);
    return res;
  } catch (error) {
    console.error("MCP health check failed:", error);
    try {
      await client?.close();
    } catch {
    }
    const response = {
      ready: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
    const res = new Response(JSON.stringify(response), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
    return res;
  }
};
export {
  POST
};
