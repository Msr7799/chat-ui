import { s as sha256, a as authCondition } from "../../../../chunks/auth.js";
import { collections } from "../../../../chunks/database.js";
import { m as models, t as taskModel, f as findConfiguredMultimodalModel, i as isRouterToolsBypassEnabled, h as hasActiveToolsSelection, p as pickToolsCapableModel, R as ROUTER_TOOLS_ROUTE, g as getRoutes, b as archSelectRoute, c as resolveRouteModels, e as prepareMessagesWithFiles, j as makeImageProcessor, v as validModelIdSchema } from "../../../../chunks/models.js";
import { E as ERROR_MESSAGES } from "../../../../chunks/errors.js";
import { error } from "@sveltejs/kit";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { M as MessageUpdateType, a as MessageReasoningUpdateType, b as MessageToolUpdateType, c as MessageUpdateStatus } from "../../../../chunks/MessageUpdate.js";
import { fileTypeFromBuffer } from "file-type";
import { c as convertLegacyConversation } from "../../../../chunks/convertLegacyConversation.js";
import { i as isMessageId, b as buildSubtree } from "../../../../chunks/buildSubtree.js";
import { a as addSibling, b as addChildren } from "../../../../chunks/addSibling.js";
import { u as usageLimits } from "../../../../chunks/usageLimits.js";
import { d as downloadFile } from "../../../../chunks/downloadFile.js";
import { c as config } from "../../../../chunks/config.js";
import { l as logger } from "../../../../chunks/logger.js";
import { A as AbortedGenerations, g as getMcpServers, r as resetMcpToolsCache, a as getOpenAiToolsForMcp } from "../../../../chunks/registry.js";
import { i as isValidUrl } from "../../../../chunks/urlSafety.js";
import { randomUUID } from "crypto";
import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { c as callLocalMcpTool } from "../../../../chunks/localRegistry.js";
import { h as hasNonEmptyToken, i as isStrictHfMcpLogin, a as hasAuthHeader } from "../../../../chunks/hf.js";
import { A as AbortRegistry } from "../../../../chunks/abortRegistry.js";
import { M as MetricsServer } from "../../../../chunks/metrics.js";
async function uploadFile(file, conv) {
  const sha = await sha256(await file.text());
  const buffer = await file.arrayBuffer();
  const mime = await fileTypeFromBuffer(buffer).then((fileType) => fileType?.mime ?? file.type);
  const upload = collections.bucket.openUploadStream(`${conv._id}-${sha}`, {
    metadata: { conversation: conv._id.toString(), mime }
  });
  upload.write(await file.arrayBuffer());
  upload.end();
  return new Promise((resolve, reject) => {
    upload.once(
      "finish",
      () => resolve({ type: "hash", value: sha, mime: file.type, name: file.name })
    );
    upload.once("error", reject);
    setTimeout(() => reject(new Error("Upload timed out")), 2e4);
  });
}
async function preprocessMessages(messages, convId) {
  return Promise.resolve(messages).then((msgs) => downloadFiles(msgs, convId)).then((msgs) => injectClipboardFiles(msgs)).then(stripEmptyInitialSystemMessage);
}
async function downloadFiles(messages, convId) {
  return Promise.all(
    messages.map(
      (message) => Promise.all((message.files ?? []).map((file) => downloadFile(file.value, convId))).then(
        (files) => ({ ...message, files })
      )
    )
  );
}
async function injectClipboardFiles(messages) {
  return Promise.all(
    messages.map((message) => {
      const plaintextFiles = message.files?.filter((file) => file.mime === "application/vnd.chatui.clipboard").map((file) => Buffer.from(file.value, "base64").toString("utf-8"));
      if (!plaintextFiles || plaintextFiles.length === 0) return message;
      return {
        ...message,
        content: `${plaintextFiles.join("\n\n")}

${message.content}`,
        files: message.files?.filter((file) => file.mime !== "application/vnd.chatui.clipboard")
      };
    })
  );
}
function stripEmptyInitialSystemMessage(messages) {
  if (!messages?.length) return messages;
  const first = messages[0];
  if (first?.from !== "system") return messages;
  const content = first?.content;
  const isEmpty = typeof content === "string" ? content.trim().length === 0 : false;
  if (isEmpty) {
    return messages.slice(1);
  }
  return messages;
}
async function* generateFromDefaultEndpoint({
  messages,
  preprompt,
  generateSettings,
  modelId,
  locals
}) {
  try {
    const model = modelId ? models.find((m) => m.id === modelId) ?? taskModel : taskModel;
    const endpoint = await model.getEndpoint();
    const tokenStream = await endpoint({ messages, preprompt, generateSettings, locals });
    for await (const output of tokenStream) {
      if (output.generated_text) {
        let generated_text = output.generated_text;
        for (const stop of [...model.parameters?.stop ?? [], "<|endoftext|>"]) {
          if (generated_text.endsWith(stop)) {
            generated_text = generated_text.slice(0, -stop.length).trimEnd();
          }
        }
        return generated_text;
      }
      yield {
        type: MessageUpdateType.Stream,
        token: output.token.text
      };
    }
  } catch (error2) {
    return "";
  }
  return "";
}
async function getReturnFromGenerator(generator) {
  let result;
  do {
    result = await generator.next();
  } while (!result.done);
  return result.value;
}
async function* generateTitleForConversation(conv, locals) {
  try {
    const userMessage = conv.messages.find((m) => m.from === "user");
    if (conv.title !== "New Chat" || !userMessage) return;
    const prompt = userMessage.content;
    const modelForTitle = config.TASK_MODEL?.trim() ? config.TASK_MODEL : conv.model;
    const title = await generateTitle(prompt, modelForTitle, locals) ?? "New Chat";
    yield {
      type: MessageUpdateType.Title,
      title
    };
  } catch (cause) {
    logger.error(Error("Failed whilte generating title for conversation", { cause }));
  }
}
async function generateTitle(prompt, modelId, locals) {
  if (config.LLM_SUMMARIZATION !== "true") {
    return prompt.split(/\s+/g).slice(0, 5).join(" ");
  }
  return await getReturnFromGenerator(
    generateFromDefaultEndpoint({
      messages: [{ from: "user", content: `User message: "${prompt}"` }],
      preprompt: `You are a chat thread titling assistant.
Goal: Produce a very short, descriptive title (2–4 words) that names the topic of the user's first message.

Rules:
- Output ONLY the title text. No prefixes, labels, quotes, emojis, hashtags, or trailing punctuation.
- Use the user's language.
- Write a noun phrase that names the topic. Do not write instructions.
- Never output just a pronoun (me/you/I/we/us/myself/yourself). Prefer a neutral subject (e.g., "Assistant", "model", or the concrete topic).
- Never include meta-words: Summarize, Summary, Title, Prompt, Topic, Subject, About, Question, Request, Chat.

Examples:
User: "Summarize hello" -> Hello
User: "How do I reverse a string in Python?" -> Python string reversal
User: "help me plan a NYC weekend" -> NYC weekend plan
User: "请解释Transformer是如何工作的" -> Transformer 工作原理
User: "tell me more about you" -> About the assistant
Return only the title text.`,
      generateSettings: {
        max_tokens: 24,
        temperature: 0
      },
      modelId,
      locals
    })
  ).then((summary) => {
    const firstFive = prompt.split(/\s+/g).slice(0, 5).join(" ");
    const trimmed = String(summary ?? "").trim();
    return trimmed || firstFive;
  }).catch((e) => {
    logger.error(e);
    const firstFive = prompt.split(/\s+/g).slice(0, 5).join(" ");
    return firstFive;
  });
}
async function generateSummaryOfReasoning(reasoning, modelId, locals) {
  const prompt = `Summarize concisely the following reasoning for the user. Keep it short (one short paragraph).

${reasoning}`;
  const summary = await (async () => {
    const it = generateFromDefaultEndpoint({
      messages: [{ from: "user", content: prompt }],
      modelId,
      locals
    });
    let out = "";
    for await (const update of it) {
      if (update.type === MessageUpdateType.Stream) out += update.token;
    }
    return out;
  })();
  return summary.trim();
}
async function* generate({
  model,
  endpoint,
  conv,
  messages,
  assistant,
  promptedAt,
  forceMultimodal,
  locals,
  abortController
}, preprompt) {
  let reasoning = false;
  let reasoningBuffer = "";
  let lastReasoningUpdate = /* @__PURE__ */ new Date();
  let status = "";
  const startTime = /* @__PURE__ */ new Date();
  const modelReasoning = Reflect.get(model, "reasoning");
  if (modelReasoning && (modelReasoning.type === "regex" || modelReasoning.type === "summarize" || modelReasoning.type === "tokens" && modelReasoning.beginToken === "")) {
    reasoning = true;
    yield {
      type: MessageUpdateType.Reasoning,
      subtype: MessageReasoningUpdateType.Status,
      status: "Started reasoning..."
    };
  }
  const stream = await endpoint({
    messages,
    preprompt,
    generateSettings: assistant?.generateSettings,
    // Allow user-level override to force multimodal
    isMultimodal: (forceMultimodal ?? false) || model.multimodal,
    conversationId: conv._id,
    locals,
    abortSignal: abortController.signal
  });
  for await (const output of stream) {
    if ("routerMetadata" in output && output.routerMetadata) {
      const hasRouteModel = Boolean(output.routerMetadata.route && output.routerMetadata.model);
      const hasProviderOnly = Boolean(output.routerMetadata.provider);
      if (hasRouteModel || hasProviderOnly) {
        yield {
          type: MessageUpdateType.RouterMetadata,
          route: output.routerMetadata.route || "",
          model: output.routerMetadata.model || "",
          provider: output.routerMetadata.provider || void 0
        };
        continue;
      }
    }
    if (output.generated_text) {
      let interrupted = !output.token.special && !model.parameters.stop?.includes(output.token.text);
      let text = output.generated_text.trimEnd();
      for (const stopToken of model.parameters.stop ?? []) {
        if (!text.endsWith(stopToken)) continue;
        interrupted = false;
        text = text.slice(0, text.length - stopToken.length);
      }
      let finalAnswer = text;
      if (modelReasoning && modelReasoning.type === "regex" && modelReasoning.regex) {
        const regex = new RegExp(modelReasoning.regex);
        finalAnswer = regex.exec(reasoningBuffer)?.[1] ?? text;
      } else if (modelReasoning && modelReasoning.type === "summarize") {
        yield {
          type: MessageUpdateType.Reasoning,
          subtype: MessageReasoningUpdateType.Status,
          status: "Summarizing reasoning..."
        };
        try {
          const summary = yield* generateFromDefaultEndpoint({
            messages: [
              {
                from: "user",
                content: `Question: ${messages[messages.length - 1].content}

Reasoning: ${reasoningBuffer}`
              }
            ],
            preprompt: `Your task is to summarize concisely all your reasoning steps and then give the final answer. Keep it short, one short paragraph at most. If the reasoning steps explicitly include a code solution, make sure to include it in your answer.`,
            modelId: Reflect.get(model, "id"),
            locals
          });
          finalAnswer = summary;
          yield {
            type: MessageUpdateType.Reasoning,
            subtype: MessageReasoningUpdateType.Status,
            status: `Done in ${Math.round(((/* @__PURE__ */ new Date()).getTime() - startTime.getTime()) / 1e3)}s.`
          };
        } catch (e) {
          finalAnswer = text;
          logger.error(e);
        }
      } else if (modelReasoning && modelReasoning.type === "tokens") {
        const beginIndex = modelReasoning.beginToken ? reasoningBuffer.indexOf(modelReasoning.beginToken) : 0;
        const endIndex = modelReasoning.endToken ? reasoningBuffer.lastIndexOf(modelReasoning.endToken) : -1;
        if (beginIndex !== -1 && endIndex !== -1 && modelReasoning.endToken) {
          finalAnswer = text.slice(0, beginIndex) + text.slice(endIndex + modelReasoning.endToken.length);
        }
      }
      yield { type: MessageUpdateType.FinalAnswer, text: finalAnswer, interrupted };
      continue;
    }
    if (modelReasoning && modelReasoning.type === "tokens") {
      if (output.token.text === modelReasoning.beginToken) {
        reasoning = true;
        reasoningBuffer += output.token.text;
        continue;
      } else if (modelReasoning.endToken && output.token.text === modelReasoning.endToken) {
        reasoning = false;
        reasoningBuffer += output.token.text;
        yield {
          type: MessageUpdateType.Reasoning,
          subtype: MessageReasoningUpdateType.Status,
          status: `Done in ${Math.round(((/* @__PURE__ */ new Date()).getTime() - startTime.getTime()) / 1e3)}s.`
        };
        continue;
      }
    }
    if (output.token.special) continue;
    if (reasoning) {
      reasoningBuffer += output.token.text;
      if (modelReasoning && modelReasoning.type === "tokens" && modelReasoning.endToken) {
        if (reasoningBuffer.lastIndexOf(modelReasoning.endToken) !== -1) {
          const endTokenIndex = reasoningBuffer.lastIndexOf(modelReasoning.endToken);
          const textBuffer = reasoningBuffer.slice(endTokenIndex + modelReasoning.endToken.length);
          reasoningBuffer = reasoningBuffer.slice(
            0,
            endTokenIndex + modelReasoning.endToken.length + 1
          );
          yield {
            type: MessageUpdateType.Reasoning,
            subtype: MessageReasoningUpdateType.Stream,
            token: output.token.text
          };
          yield { type: MessageUpdateType.Stream, token: textBuffer };
          yield {
            type: MessageUpdateType.Reasoning,
            subtype: MessageReasoningUpdateType.Status,
            status: `Done in ${Math.round(((/* @__PURE__ */ new Date()).getTime() - startTime.getTime()) / 1e3)}s.`
          };
          reasoning = false;
          continue;
        }
      }
      if (status !== "") {
        yield {
          type: MessageUpdateType.Reasoning,
          subtype: MessageReasoningUpdateType.Status,
          status
        };
        status = "";
      }
      if (Reflect.get(config, "REASONING_SUMMARY") === "true" && (/* @__PURE__ */ new Date()).getTime() - lastReasoningUpdate.getTime() > 4e3) {
        lastReasoningUpdate = /* @__PURE__ */ new Date();
        try {
          generateSummaryOfReasoning(reasoningBuffer, model.id, locals).then((summary) => {
            status = summary;
          });
        } catch (e) {
          logger.error(e);
        }
      }
      yield {
        type: MessageUpdateType.Reasoning,
        subtype: MessageReasoningUpdateType.Stream,
        token: output.token.text
      };
    } else {
      yield { type: MessageUpdateType.Stream, token: output.token.text };
    }
    const date = AbortedGenerations.getInstance().getAbortTime(conv._id.toString());
    if (date && date > promptedAt) {
      logger.info(`Aborting generation for conversation ${conv._id}`);
      if (!abortController.signal.aborted) {
        abortController.abort();
      }
      break;
    }
    if (!output) break;
  }
}
function buildToolPreprompt(tools) {
  if (!Array.isArray(tools) || tools.length === 0) return "";
  const names = tools.map((t) => t?.function?.name ? String(t.function.name) : "").filter((s) => s.length > 0);
  if (names.length === 0) return "";
  const currentDate = (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  return [
    `You can use the following tools if helpful: ${names.join(", ")}.`,
    `Today's date: ${currentDate}.`,
    `If a tool generates an image, you can inline it directly: ![alt text](image_url).`,
    `If a tool needs an image, set its image field ("input_image", "image", or "image_url") to a reference like "image_1", "image_2", etc. (ordered by when the user uploaded them).`,
    `Default to image references; only use a full http(s) URL when the tool description explicitly asks for one, or reuse a URL a previous tool returned.`
  ].join(" ");
}
const ROUTER_REASONING_REGEX = /<think>[\s\S]*?(?:<\/think>|$)/g;
function stripReasoningBlocks(text) {
  const stripped = text.replace(ROUTER_REASONING_REGEX, "");
  return stripped === text ? text : stripped.trim();
}
function stripReasoningFromMessageForRouting(message) {
  const clone = { ...message };
  if ("reasoning" in clone) {
    delete clone.reasoning;
  }
  const content = typeof message.content === "string" ? stripReasoningBlocks(message.content) : message.content;
  return {
    ...clone,
    content
  };
}
async function resolveRouterTarget({
  model,
  messages,
  conversationId,
  hasImageInput,
  locals
}) {
  let targetModel = model;
  let candidateModelId;
  let resolvedRoute;
  let runMcp = true;
  if (!model.isRouter) {
    return { runMcp, targetModel };
  }
  try {
    const mod = await import("../../../../chunks/models.js").then((n) => n.n);
    const allModels = mod.models;
    if (hasImageInput) {
      const multimodalCandidate = findConfiguredMultimodalModel(allModels);
      if (!multimodalCandidate) {
        runMcp = false;
        logger.warn(
          { configuredModel: config.LLM_ROUTER_MULTIMODAL_MODEL },
          "[mcp] multimodal input but configured model missing or invalid; skipping MCP route"
        );
      } else {
        targetModel = multimodalCandidate;
        candidateModelId = multimodalCandidate.id ?? multimodalCandidate.name;
        resolvedRoute = "multimodal";
      }
    } else {
      const toolsEnabled = isRouterToolsBypassEnabled();
      const hasToolsActive = hasActiveToolsSelection(locals);
      if (toolsEnabled && hasToolsActive) {
        const found = pickToolsCapableModel(allModels);
        if (found) {
          targetModel = found;
          candidateModelId = found.id ?? found.name;
          resolvedRoute = ROUTER_TOOLS_ROUTE;
          return { runMcp, targetModel, candidateModelId, resolvedRoute };
        }
      }
      const routes = await getRoutes();
      const sanitized = messages.map(stripReasoningFromMessageForRouting);
      const { routeName } = await archSelectRoute(sanitized, conversationId, locals);
      resolvedRoute = routeName;
      const fallbackModel = config.LLM_ROUTER_FALLBACK_MODEL || model.id;
      const { candidates } = resolveRouteModels(routeName, routes, fallbackModel);
      const primaryCandidateId = candidates[0];
      if (!primaryCandidateId || primaryCandidateId === fallbackModel) {
        runMcp = false;
      } else {
        const found = allModels?.find(
          (candidate) => candidate.id === primaryCandidateId || candidate.name === primaryCandidateId
        );
        if (found) {
          targetModel = found;
          candidateModelId = primaryCandidateId;
        } else {
          runMcp = false;
        }
      }
    }
  } catch (error2) {
    logger.warn({ err: String(error2) }, "[mcp] routing preflight failed");
    runMcp = false;
  }
  return { runMcp, targetModel, candidateModelId, resolvedRoute };
}
var ToolResultStatus = /* @__PURE__ */ ((ToolResultStatus2) => {
  ToolResultStatus2["Success"] = "success";
  ToolResultStatus2["Error"] = "error";
  return ToolResultStatus2;
})(ToolResultStatus || {});
const pool = /* @__PURE__ */ new Map();
function keyOf(server) {
  const headers = Object.entries(server.headers ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`).join("|\0|");
  return `${server.url}|${headers}`;
}
async function getClient(server, signal) {
  const key = keyOf(server);
  const existing = pool.get(key);
  if (existing) return existing;
  let firstError;
  const client = new Client({ name: "chat-ui-mcp", version: "0.1.0" });
  const url = new URL(server.url);
  const requestInit = { headers: server.headers, signal };
  try {
    try {
      await client.connect(new StreamableHTTPClientTransport(url, { requestInit }));
    } catch (httpErr) {
      firstError = httpErr;
      await client.connect(new SSEClientTransport(url, { requestInit }));
    }
  } catch (err) {
    try {
      await client.close?.();
    } catch {
    }
    if (firstError) {
      const message = "HTTP transport failed: " + String(firstError instanceof Error ? firstError.message : firstError) + "; SSE fallback failed: " + String(err instanceof Error ? err.message : err);
      throw new Error(message, { cause: err instanceof Error ? err : void 0 });
    }
    throw err;
  }
  pool.set(key, client);
  return client;
}
async function drainPool() {
  for (const [key, client] of pool) {
    try {
      await client.close?.();
    } catch {
    }
    pool.delete(key);
  }
}
const DEFAULT_TIMEOUT_MS = 3e4;
async function callMcpTool(server, tool, args = {}, {
  timeoutMs = DEFAULT_TIMEOUT_MS,
  signal,
  client
} = {}) {
  const normalizedArgs = typeof args === "object" && args !== null && !Array.isArray(args) ? args : void 0;
  const activeClient = client ?? await getClient(server, signal);
  const response = await activeClient.callTool(
    { name: tool, arguments: normalizedArgs },
    void 0,
    {
      signal,
      timeout: timeoutMs,
      // Enable progress tokens so long-running tools keep extending the timeout.
      onprogress: () => {
      },
      resetTimeoutOnProgress: true
    }
  );
  const parts = Array.isArray(response?.content) ? response.content : [];
  const textParts = parts.filter((part) => {
    if (typeof part !== "object" || part === null) return false;
    const obj = part;
    return obj["type"] === "text" && typeof obj["text"] === "string";
  }).map((p) => p.text);
  const text = textParts.join("\n");
  const structured = response?.structuredContent;
  const contentBlocks = Array.isArray(response?.content) ? response.content : void 0;
  return { text, structured, content: contentBlocks };
}
const IMAGE_REF_KIND = {
  prefix: "image",
  matches: (mime) => typeof mime === "string" && mime.startsWith("image/"),
  toDataUrl: (payload) => `data:${payload.mime};base64,${payload.base64}`
};
const DEFAULT_REF_KINDS = [IMAGE_REF_KIND];
function buildFileRefResolver(messages, refKinds = DEFAULT_REF_KINDS) {
  if (!Array.isArray(refKinds) || refKinds.length === 0) return void 0;
  const buckets = /* @__PURE__ */ new Map();
  for (const msg of messages) {
    if (msg.from !== "user") continue;
    for (const file of msg.files ?? []) {
      const mime = file?.mime ?? "";
      const kind = refKinds.find((k) => k.matches(mime));
      if (!kind) continue;
      const payload = { name: file.name, mime, base64: file.value };
      const arr = buckets.get(kind) ?? [];
      arr.push(payload);
      buckets.set(kind, arr);
    }
  }
  if (buckets.size === 0) return void 0;
  const resolver = (ref) => {
    if (!ref || typeof ref !== "string") return void 0;
    const trimmed = ref.trim().toLowerCase();
    for (const kind of refKinds) {
      const match = new RegExp(`^${kind.prefix}_(\\d+)$`).exec(trimmed);
      if (!match) continue;
      const idx = Number(match[1]) - 1;
      const files = buckets.get(kind) ?? [];
      if (Number.isFinite(idx) && idx >= 0 && idx < files.length) {
        const payload = files[idx];
        return payload ? { ...payload, refKind: kind } : void 0;
      }
    }
    return void 0;
  };
  return resolver;
}
function buildImageRefResolver(messages) {
  return buildFileRefResolver(messages, [IMAGE_REF_KIND]);
}
const DEFAULT_FIELD_RULES = [
  {
    keys: ["image_ref"],
    action: "attachPayload",
    attachKey: "image",
    allowedPrefixes: ["image"]
  },
  {
    keys: ["input_image", "image", "image_url"],
    action: "replaceWithDataUrl",
    allowedPrefixes: ["image"]
  }
];
function attachFileRefsToArgs(argsObj, resolveRef, fieldRules = DEFAULT_FIELD_RULES) {
  if (!resolveRef) return;
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const v of node) visit(v);
      return;
    }
    const obj = node;
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value !== "string") {
        if (value && typeof value === "object") visit(value);
        continue;
      }
      const resolved = resolveRef(value);
      if (!resolved) continue;
      const rule = fieldRules.find((r) => r.keys.includes(key));
      if (!rule) continue;
      if (rule.allowedPrefixes && !rule.allowedPrefixes.includes(resolved.refKind.prefix)) continue;
      if (rule.action === "attachPayload") {
        const targetKey = rule.attachKey ?? "file";
        if (typeof obj[targetKey] !== "object" || obj[targetKey] === null || Array.isArray(obj[targetKey])) {
          obj[targetKey] = {
            name: resolved.name,
            mime: resolved.mime,
            base64: resolved.base64
          };
        }
      } else if (rule.action === "replaceWithDataUrl") {
        const toUrl = resolved.refKind.toDataUrl ?? ((p) => `data:${p.mime};base64,${p.base64}`);
        obj[key] = toUrl(resolved);
      }
    }
  };
  visit(argsObj);
}
const serverMap = (servers) => {
  const map = /* @__PURE__ */ new Map();
  for (const server of servers) {
    if (server?.name) {
      map.set(server.name, server);
    }
  }
  return map;
};
async function* executeToolCalls({
  calls,
  mapping,
  servers,
  parseArgs,
  resolveFileRef,
  toPrimitive,
  processToolOutput,
  abortSignal,
  toolTimeoutMs = 3e4
}) {
  const toolMessages = [];
  const toolRuns = [];
  const serverLookup = serverMap(servers);
  const prepared = calls.map((call) => {
    const argsObj = parseArgs(call.arguments);
    const paramsClean = {};
    for (const [k, v] of Object.entries(argsObj ?? {})) {
      const prim = toPrimitive(v);
      if (prim !== void 0) paramsClean[k] = prim;
    }
    attachFileRefsToArgs(argsObj, resolveFileRef);
    return { call, argsObj, paramsClean, uuid: randomUUID() };
  });
  for (const p of prepared) {
    yield {
      type: "update",
      update: {
        type: MessageUpdateType.Tool,
        subtype: MessageToolUpdateType.Call,
        uuid: p.uuid,
        call: { name: p.call.name, parameters: p.paramsClean }
      }
    };
    yield {
      type: "update",
      update: {
        type: MessageUpdateType.Tool,
        subtype: MessageToolUpdateType.ETA,
        uuid: p.uuid,
        eta: 10
      }
    };
  }
  const distinctServerNames = Array.from(
    new Set(
      prepared.map((p) => mapping[p.call.name]).filter((m) => m && !m.isLocal).map((m) => m.server)
    )
  );
  const clientMap = /* @__PURE__ */ new Map();
  await Promise.all(
    distinctServerNames.map(async (name) => {
      const cfg = serverLookup.get(name);
      if (!cfg) return;
      try {
        const client = await getClient(cfg, abortSignal);
        clientMap.set(name, client);
      } catch (e) {
        logger.warn({ server: name, err: String(e) }, "[mcp] failed to connect client");
      }
    })
  );
  function createQueue() {
    const items = [];
    const waiters = [];
    let closed = false;
    return {
      push(item) {
        const waiter = waiters.shift();
        if (waiter) waiter({ value: item, done: false });
        else items.push(item);
      },
      close() {
        closed = true;
        let waiter;
        while (waiter = waiters.shift()) {
          waiter({ value: void 0, done: true });
        }
      },
      async *iterator() {
        for (; ; ) {
          if (items.length) {
            const first = items.shift();
            if (first !== void 0) yield first;
            continue;
          }
          if (closed) return;
          const value = await new Promise((res) => waiters.push(res));
          if (value.done) return;
          yield value.value;
        }
      }
    };
  }
  const q = createQueue();
  const tasks = prepared.map(async (p, index) => {
    const mappingEntry = mapping[p.call.name];
    if (!mappingEntry) {
      q.push({
        index,
        error: `Unknown MCP function: ${p.call.name}`,
        uuid: p.uuid,
        paramsClean: p.paramsClean
      });
      return;
    }
    const serverCfg = serverLookup.get(mappingEntry.server);
    const isLocal = Boolean(mappingEntry.isLocal);
    if (!isLocal && !serverCfg) {
      q.push({
        index,
        error: `Unknown MCP server: ${mappingEntry.server}`,
        uuid: p.uuid,
        paramsClean: p.paramsClean
      });
      return;
    }
    const client = isLocal ? void 0 : clientMap.get(mappingEntry.server);
    try {
      logger.debug(
        { server: mappingEntry.server, tool: mappingEntry.tool, parameters: p.paramsClean },
        "[mcp] invoking tool"
      );
      const toolResponse = isLocal ? await callLocalMcpTool(mappingEntry.server, mappingEntry.tool, p.argsObj, {
        signal: abortSignal,
        timeoutMs: toolTimeoutMs
      }) : await callMcpTool(serverCfg, mappingEntry.tool, p.argsObj, {
        client,
        signal: abortSignal,
        timeoutMs: toolTimeoutMs
      });
      const { annotated } = processToolOutput(toolResponse.text ?? "");
      logger.debug(
        { server: mappingEntry.server, tool: mappingEntry.tool },
        "[mcp] tool call completed"
      );
      q.push({
        index,
        output: annotated,
        structured: toolResponse.structured,
        blocks: toolResponse.content,
        uuid: p.uuid,
        paramsClean: p.paramsClean
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(
        { server: mappingEntry.server, tool: mappingEntry.tool, err: message },
        "[mcp] tool call failed"
      );
      q.push({ index, error: message, uuid: p.uuid, paramsClean: p.paramsClean });
    }
  });
  Promise.allSettled(tasks).then(() => q.close());
  const results = [];
  for await (const r of q.iterator()) {
    results.push(r);
    if (r.error) {
      yield {
        type: "update",
        update: {
          type: MessageUpdateType.Tool,
          subtype: MessageToolUpdateType.Error,
          uuid: r.uuid,
          message: r.error
        }
      };
    } else {
      yield {
        type: "update",
        update: {
          type: MessageUpdateType.Tool,
          subtype: MessageToolUpdateType.Result,
          uuid: r.uuid,
          result: {
            status: ToolResultStatus.Success,
            call: { name: prepared[r.index].call.name, parameters: r.paramsClean },
            outputs: [
              {
                text: r.output ?? "",
                structured: r.structured,
                content: r.blocks
              }
            ],
            display: true
          }
        }
      };
    }
  }
  results.sort((a, b) => a.index - b.index);
  for (const r of results) {
    const name = prepared[r.index].call.name;
    const id = prepared[r.index].call.id;
    if (!r.error) {
      const output = r.output ?? "";
      toolRuns.push({ name, parameters: r.paramsClean, output });
      toolMessages.push({ role: "tool", tool_call_id: id, content: output });
    }
  }
  yield { type: "complete", summary: { toolMessages, toolRuns } };
}
async function* runMcpFlow({
  model,
  conv,
  messages,
  assistant,
  forceMultimodal,
  forceTools,
  locals,
  preprompt,
  abortSignal
}) {
  let servers = getMcpServers();
  try {
    console.debug(
      { baseServers: servers.map((s) => ({ name: s.name, url: s.url })), count: servers.length },
      "[mcp] base servers loaded"
    );
  } catch {
  }
  try {
    const reqMcp = locals?.mcp;
    const custom = Array.isArray(reqMcp?.selectedServers) ? reqMcp?.selectedServers : [];
    if (custom.length > 0) {
      resetMcpToolsCache();
      const byName = /* @__PURE__ */ new Map();
      for (const s of servers) byName.set(s.name, s);
      for (const s of custom) byName.set(s.name, s);
      servers = [...byName.values()];
      try {
        console.debug(
          {
            customProvidedCount: custom.length,
            mergedServers: servers.map((s) => ({
              name: s.name,
              url: s.url,
              hasAuth: !!s.headers?.Authorization
            }))
          },
          "[mcp] merged request-provided servers"
        );
      } catch {
      }
    }
    const names = Array.isArray(reqMcp?.selectedServerNames) ? reqMcp?.selectedServerNames : void 0;
    if (Array.isArray(names)) {
      const before = servers.map((s) => s.name);
      servers = servers.filter((s) => names.includes(s.name));
      try {
        console.debug(
          { selectedNames: names, before, after: servers.map((s) => s.name) },
          "[mcp] applied name selection"
        );
      } catch {
      }
    }
  } catch {
  }
  if (servers.length === 0) {
    console.warn("[mcp] no MCP servers selected after merge/name filter");
    return false;
  }
  const localServerNames = servers.filter((s) => s.url.startsWith("local://")).map((s) => s.name);
  let remoteServers = servers.filter((s) => !s.url.startsWith("local://"));
  {
    const before = remoteServers.slice();
    remoteServers = remoteServers.filter((s) => {
      try {
        return isValidUrl(s.url);
      } catch {
        return false;
      }
    });
    try {
      const rejected = before.filter((b) => !remoteServers.includes(b));
      if (rejected.length > 0) {
        console.warn(
          { rejected: rejected.map((r) => ({ name: r.name, url: r.url })) },
          "[mcp] rejected servers by URL safety"
        );
      }
    } catch {
    }
  }
  if (remoteServers.length === 0 && localServerNames.length === 0) {
    console.warn("[mcp] all selected MCP servers rejected by URL safety guard");
    return false;
  }
  try {
    const shouldForward = config.MCP_FORWARD_HF_USER_TOKEN === "true";
    const userToken = locals?.hfAccessToken ?? locals?.token;
    if (shouldForward && hasNonEmptyToken(userToken)) {
      const overlayApplied = [];
      remoteServers = remoteServers.map((s) => {
        try {
          if (isStrictHfMcpLogin(s.url) && !hasAuthHeader(s.headers)) {
            overlayApplied.push(s.name);
            return {
              ...s,
              headers: { ...s.headers ?? {}, Authorization: `Bearer ${userToken}` }
            };
          }
        } catch {
        }
        return s;
      });
      if (overlayApplied.length > 0) {
        try {
          console.debug({ overlayApplied }, "[mcp] forwarded HF token to servers");
        } catch {
        }
      }
    }
  } catch {
  }
  console.debug(
    {
      remoteCount: remoteServers.length,
      localCount: localServerNames.length,
      servers: [...remoteServers.map((s) => s.name), ...localServerNames]
    },
    "[mcp] servers configured"
  );
  if (remoteServers.length === 0 && localServerNames.length === 0) {
    return false;
  }
  try {
    const supportsTools = Boolean(model.supportsTools);
    const toolsEnabled = Boolean(forceTools) || supportsTools;
    console.debug(
      {
        model: model.id ?? model.name,
        supportsTools,
        forceTools: Boolean(forceTools),
        toolsEnabled
      },
      "[mcp] tools gate evaluation"
    );
    if (!toolsEnabled) {
      console.info(
        { model: model.id ?? model.name },
        "[mcp] tools disabled for model; skipping MCP flow"
      );
      return false;
    }
  } catch {
  }
  const resolveFileRef = buildImageRefResolver(messages);
  const imageProcessor = makeImageProcessor({
    supportedMimeTypes: ["image/png", "image/jpeg"],
    preferredMimeType: "image/jpeg",
    maxSizeInMB: 1,
    maxWidth: 1024,
    maxHeight: 1024
  });
  const hasImageInput = messages.some(
    (msg) => (msg.files ?? []).some(
      (file) => typeof file?.mime === "string" && file.mime.startsWith("image/")
    )
  );
  const { runMcp, targetModel, candidateModelId, resolvedRoute } = await resolveRouterTarget({
    model,
    messages,
    conversationId: conv._id.toString(),
    hasImageInput,
    locals
  });
  if (!runMcp) {
    console.info(
      { model: targetModel.id ?? targetModel.name, resolvedRoute },
      "[mcp] runMcp=false (routing chose non-tools candidate)"
    );
    return false;
  }
  const { tools: oaTools, mapping } = await getOpenAiToolsForMcp(remoteServers, localServerNames, {
    signal: abortSignal
  });
  try {
    console.info(
      { toolCount: oaTools.length, toolNames: oaTools.map((t) => t.function.name) },
      "[mcp] openai tool defs built"
    );
  } catch {
  }
  if (oaTools.length === 0) {
    console.warn("[mcp] zero tools available after listing; skipping MCP flow");
    return false;
  }
  try {
    const { OpenAI } = await import("openai");
    let providerHeader;
    const captureProviderFetch = async (input, init) => {
      const res = await fetch(input, init);
      const p = res.headers.get("x-inference-provider");
      if (p && !providerHeader) providerHeader = p;
      return res;
    };
    const openai = new OpenAI({
      apiKey: config.OPENAI_API_KEY || config.HF_TOKEN || "sk-",
      baseURL: config.OPENAI_BASE_URL,
      fetch: captureProviderFetch,
      defaultHeaders: {
        // Bill to organization if configured (HuggingChat only)
        ...config.isHuggingChat && locals?.billingOrganization ? { "X-HF-Bill-To": locals.billingOrganization } : {}
      }
    });
    const mmEnabled = (forceMultimodal ?? false) || targetModel.multimodal;
    console.info(
      {
        targetModel: targetModel.id ?? targetModel.name,
        mmEnabled,
        route: resolvedRoute,
        candidateModelId,
        toolCount: oaTools.length,
        hasUserToken: Boolean(locals?.token)
      },
      "[mcp] starting completion with tools"
    );
    let messagesOpenAI = await prepareMessagesWithFiles(
      messages,
      imageProcessor,
      mmEnabled
    );
    const toolPreprompt = buildToolPreprompt(oaTools);
    const prepromptPieces = [];
    if (toolPreprompt.trim().length > 0) {
      prepromptPieces.push(toolPreprompt);
    }
    if (typeof preprompt === "string" && preprompt.trim().length > 0) {
      prepromptPieces.push(preprompt);
    }
    const mergedPreprompt = prepromptPieces.join("\n\n");
    const hasSystemMessage = messagesOpenAI.length > 0 && messagesOpenAI[0]?.role === "system";
    if (hasSystemMessage) {
      if (mergedPreprompt.length > 0) {
        const existing = messagesOpenAI[0].content ?? "";
        const existingText = typeof existing === "string" ? existing : "";
        messagesOpenAI[0].content = mergedPreprompt + (existingText ? "\n\n" + existingText : "");
      }
    } else if (mergedPreprompt.length > 0) {
      messagesOpenAI = [{ role: "system", content: mergedPreprompt }, ...messagesOpenAI];
    }
    if (typeof config.OPENAI_BASE_URL === "string" && config.OPENAI_BASE_URL.length > 0 && (config.OPENAI_BASE_URL.includes("hf.space") || config.OPENAI_BASE_URL.includes("gradio.app")) && messagesOpenAI[0]?.role === "system") {
      messagesOpenAI[0] = { ...messagesOpenAI[0], role: "user" };
    }
    const parameters = { ...targetModel.parameters, ...assistant?.generateSettings };
    const maxTokens = parameters?.max_tokens ?? parameters?.max_new_tokens ?? parameters?.max_completion_tokens;
    const stopSequences = typeof parameters?.stop === "string" ? parameters.stop : Array.isArray(parameters?.stop) ? parameters.stop : void 0;
    const completionBase = {
      model: targetModel.id ?? targetModel.name,
      stream: true,
      temperature: typeof parameters?.temperature === "number" ? parameters.temperature : void 0,
      top_p: typeof parameters?.top_p === "number" ? parameters.top_p : void 0,
      frequency_penalty: typeof parameters?.frequency_penalty === "number" ? parameters.frequency_penalty : typeof parameters?.repetition_penalty === "number" ? parameters.repetition_penalty : void 0,
      presence_penalty: typeof parameters?.presence_penalty === "number" ? parameters.presence_penalty : void 0,
      stop: stopSequences,
      max_tokens: typeof maxTokens === "number" ? maxTokens : void 0,
      tools: oaTools,
      tool_choice: "auto"
    };
    const toPrimitive = (value) => {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return value;
      }
      return void 0;
    };
    const parseArgs = (raw) => {
      if (typeof raw !== "string" || raw.trim().length === 0) return {};
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    };
    const processToolOutput = (text) => ({ annotated: text, sources: [] });
    let lastAssistantContent = "";
    let streamedContent = false;
    let thinkOpen = false;
    if (resolvedRoute && candidateModelId) {
      yield {
        type: MessageUpdateType.RouterMetadata,
        route: resolvedRoute,
        model: candidateModelId
      };
      console.debug(
        { route: resolvedRoute, model: candidateModelId },
        "[mcp] router metadata emitted"
      );
    }
    for (let loop = 0; loop < 10; loop += 1) {
      lastAssistantContent = "";
      streamedContent = false;
      const completionRequest = {
        ...completionBase,
        messages: messagesOpenAI
      };
      const completionStream = await openai.chat.completions.create(
        completionRequest,
        {
          signal: abortSignal,
          headers: {
            "ChatUI-Conversation-ID": conv._id.toString(),
            "X-use-cache": "false"
            // Don't override Authorization if using API key from config
            // ...(locals?.token ? { Authorization: `Bearer ${locals.token}` } : {}),
          }
        }
      );
      if (providerHeader) {
        yield {
          type: MessageUpdateType.RouterMetadata,
          route: "",
          model: "",
          provider: providerHeader
        };
        console.debug({ provider: providerHeader }, "[mcp] provider metadata emitted");
      }
      const toolCallState = {};
      let firstToolDeltaLogged = false;
      let sawToolCall = false;
      let tokenCount = 0;
      for await (const chunk of completionStream) {
        const choice = chunk.choices?.[0];
        const delta = choice?.delta;
        if (!delta) continue;
        const chunkToolCalls = delta.tool_calls ?? [];
        if (chunkToolCalls.length > 0) {
          sawToolCall = true;
          for (const call of chunkToolCalls) {
            const toolCall = call;
            const index = toolCall.index ?? 0;
            const current = toolCallState[index] ?? { arguments: "" };
            if (toolCall.id) current.id = toolCall.id;
            if (toolCall.function?.name) current.name = toolCall.function.name;
            if (toolCall.function?.arguments) current.arguments += toolCall.function.arguments;
            toolCallState[index] = current;
          }
          if (!firstToolDeltaLogged) {
            try {
              const first = toolCallState[Object.keys(toolCallState).map((k) => Number(k)).sort((a, b) => a - b)[0] ?? 0];
              console.info(
                { firstCallName: first?.name, hasId: Boolean(first?.id) },
                "[mcp] observed streamed tool_call delta"
              );
              firstToolDeltaLogged = true;
            } catch {
            }
          }
        }
        const deltaContent = (() => {
          if (typeof delta.content === "string") return delta.content;
          const maybeParts = delta.content;
          if (Array.isArray(maybeParts)) {
            return maybeParts.map(
              (part) => typeof part === "object" && part !== null && "text" in part && typeof part.text === "string" ? String(part.text) : ""
            ).join("");
          }
          return "";
        })();
        const deltaReasoning = typeof delta?.reasoning === "string" ? delta.reasoning : typeof delta?.reasoning_content === "string" ? delta.reasoning_content : "";
        let combined = "";
        if (deltaReasoning.trim().length > 0) {
          if (!thinkOpen) {
            combined += "<think>" + deltaReasoning;
            thinkOpen = true;
          } else {
            combined += deltaReasoning;
          }
        }
        if (deltaContent && deltaContent.length > 0) {
          if (thinkOpen) {
            combined += "</think>" + deltaContent;
            thinkOpen = false;
          } else {
            combined += deltaContent;
          }
        }
        if (combined.length > 0) {
          lastAssistantContent += combined;
          if (!sawToolCall) {
            streamedContent = true;
            yield { type: MessageUpdateType.Stream, token: combined };
            tokenCount += combined.length;
          }
        }
      }
      console.info(
        { sawToolCalls: Object.keys(toolCallState).length > 0, tokens: tokenCount, loop },
        "[mcp] completion stream closed"
      );
      if (Object.keys(toolCallState).length > 0) {
        const missingId = Object.values(toolCallState).some((c) => c?.name && !c?.id);
        let calls;
        if (missingId) {
          console.debug(
            { loop },
            "[mcp] missing tool_call id in stream; retrying non-stream to recover ids"
          );
          const nonStream = await openai.chat.completions.create(
            { ...completionBase, messages: messagesOpenAI, stream: false },
            {
              signal: abortSignal,
              headers: {
                "ChatUI-Conversation-ID": conv._id.toString(),
                "X-use-cache": "false"
                // Don't override Authorization if using API key from config
                // ...(locals?.token ? { Authorization: `Bearer ${locals.token}` } : {}),
              }
            }
          );
          const tc = nonStream.choices?.[0]?.message?.tool_calls ?? [];
          calls = tc.map((t) => ({
            id: t.id,
            name: t.function?.name ?? "",
            arguments: t.function?.arguments ?? ""
          }));
        } else {
          calls = Object.values(toolCallState).map((c) => c?.id && c?.name ? c : void 0).filter(Boolean).map((c) => ({
            id: c?.id ?? "",
            name: c?.name ?? "",
            arguments: c?.arguments ?? ""
          }));
        }
        const toolCalls = calls.map((call) => ({
          id: call.id,
          type: "function",
          function: { name: call.name, arguments: call.arguments }
        }));
        const assistantContentForToolMsg = lastAssistantContent.replace(
          /<think>[\s\S]*?(?:<\/think>|$)/g,
          ""
        );
        const assistantToolMessage = {
          role: "assistant",
          content: assistantContentForToolMsg,
          tool_calls: toolCalls
        };
        const exec = executeToolCalls({
          calls,
          mapping,
          servers,
          parseArgs,
          resolveFileRef,
          toPrimitive,
          processToolOutput,
          abortSignal
        });
        let toolMsgCount = 0;
        let toolRunCount = 0;
        for await (const event of exec) {
          if (event.type === "update") {
            yield event.update;
          } else {
            messagesOpenAI = [
              ...messagesOpenAI,
              assistantToolMessage,
              ...event.summary.toolMessages ?? []
            ];
            toolMsgCount = event.summary.toolMessages?.length ?? 0;
            toolRunCount = event.summary.toolRuns?.length ?? 0;
            console.info(
              { toolMsgCount, toolRunCount },
              "[mcp] tools executed; continuing loop for follow-up completion"
            );
          }
        }
        continue;
      }
      if (thinkOpen) {
        lastAssistantContent += "</think>";
        thinkOpen = false;
      }
      if (!streamedContent && lastAssistantContent.trim().length > 0) {
        yield { type: MessageUpdateType.Stream, token: lastAssistantContent };
      }
      yield {
        type: MessageUpdateType.FinalAnswer,
        text: lastAssistantContent,
        interrupted: false
      };
      console.info(
        { length: lastAssistantContent.length, loop },
        "[mcp] final answer emitted (no tool_calls)"
      );
      return true;
    }
    console.warn("[mcp] exceeded tool-followup loops; falling back");
  } catch (err) {
    const msg = String(err ?? "");
    const isAbort = abortSignal && abortSignal.aborted || msg.includes("AbortError") || msg.includes("APIUserAbortError") || msg.includes("Request was aborted");
    if (isAbort) {
      console.debug("[mcp] aborted by user");
      return false;
    }
    console.warn({ err: msg }, "[mcp] flow failed, falling back to default endpoint");
  } finally {
    await drainPool();
  }
  return false;
}
async function* mergeAsyncGenerators(generators) {
  const promises = /* @__PURE__ */ new Map();
  const results = /* @__PURE__ */ new Map();
  for (const gen of generators) {
    promises.set(
      gen,
      gen.next().then((result) => ({ gen, ...result }))
    );
  }
  while (promises.size) {
    const { gen, value, done } = await Promise.race(promises.values());
    if (done) {
      results.set(gen, value);
      promises.delete(gen);
    } else {
      promises.set(
        gen,
        gen.next().then((result) => ({ gen, ...result }))
      );
      yield value;
    }
  }
  const orderedResults = generators.map((gen) => results.get(gen));
  return orderedResults;
}
async function* keepAlive(done) {
  while (!done.aborted) {
    yield {
      type: MessageUpdateType.Status,
      status: MessageUpdateStatus.KeepAlive
    };
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
async function* textGeneration(ctx) {
  const done = new AbortController();
  const titleGen = generateTitleForConversation(ctx.conv, ctx.locals);
  const textGen = textGenerationWithoutTitle(ctx, done);
  const keepAliveGen = keepAlive(done.signal);
  yield* mergeAsyncGenerators([titleGen, textGen, keepAliveGen]);
}
async function* textGenerationWithoutTitle(ctx, done) {
  yield {
    type: MessageUpdateType.Status,
    status: MessageUpdateStatus.Started
  };
  const { conv, messages } = ctx;
  const convId = conv._id;
  const preprompt = conv.preprompt;
  const processedMessages = await preprocessMessages(messages, convId);
  try {
    const mcpGen = runMcpFlow({
      model: ctx.model,
      conv,
      messages: processedMessages,
      assistant: ctx.assistant,
      forceMultimodal: ctx.forceMultimodal,
      forceTools: ctx.forceTools,
      locals: ctx.locals,
      preprompt,
      abortSignal: ctx.abortController.signal
    });
    let step = await mcpGen.next();
    while (!step.done) {
      yield step.value;
      step = await mcpGen.next();
    }
    const didRunMcp = Boolean(step.value);
    if (!didRunMcp) {
      yield* generate({ ...ctx, messages: processedMessages }, preprompt);
    }
  } catch {
    yield* generate({ ...ctx, messages: processedMessages }, preprompt);
  }
  done.abort();
}
async function POST({ request, locals, params, getClientAddress }) {
  const id = z.string().parse(params.id);
  const convId = new ObjectId(id);
  const promptedAt = /* @__PURE__ */ new Date();
  const userId = locals.user?._id ?? locals.sessionId;
  if (!userId) {
    error(401, "Unauthorized");
  }
  const convBeforeCheck = await collections.conversations.findOne({
    _id: convId,
    ...authCondition(locals)
  });
  if (convBeforeCheck && !convBeforeCheck.rootMessageId) {
    const res = await collections.conversations.updateOne(
      {
        _id: convId
      },
      {
        $set: {
          ...convBeforeCheck,
          ...convertLegacyConversation(convBeforeCheck)
        }
      }
    );
    if (!res.acknowledged) {
      error(500, "Failed to convert conversation");
    }
  }
  const conv = await collections.conversations.findOne({
    _id: convId,
    ...authCondition(locals)
  });
  if (!conv) {
    error(404, "Conversation not found");
  }
  await collections.messageEvents.insertOne({
    type: "message",
    userId,
    createdAt: /* @__PURE__ */ new Date(),
    expiresAt: new Date(Date.now() + 6e4),
    ip: getClientAddress()
  });
  if (usageLimits?.messagesPerMinute) {
    const nEvents = Math.max(
      await collections.messageEvents.countDocuments({
        userId,
        type: "message",
        expiresAt: { $gt: /* @__PURE__ */ new Date() }
      }),
      await collections.messageEvents.countDocuments({
        ip: getClientAddress(),
        type: "message",
        expiresAt: { $gt: /* @__PURE__ */ new Date() }
      })
    );
    if (nEvents > usageLimits.messagesPerMinute) {
      error(429, ERROR_MESSAGES.rateLimited);
    }
  }
  if (usageLimits?.messages && conv.messages.length > usageLimits.messages) {
    error(
      429,
      `This conversation has more than ${usageLimits.messages} messages. Start a new one to continue`
    );
  }
  const model = models.find((m) => m.id === conv.model);
  if (!model) {
    error(410, "Model not available anymore");
  }
  const form = await request.formData();
  const json = form.get("data");
  if (!json || typeof json !== "string") {
    error(400, "Invalid request");
  }
  const {
    inputs: newPrompt,
    id: messageId,
    is_retry: isRetry,
    selectedMcpServerNames,
    selectedMcpServers
  } = z.object({
    id: z.string().uuid().refine(isMessageId).optional(),
    // parent message id to append to for a normal message, or the message id for a retry/continue
    inputs: z.optional(
      z.string().min(1).transform((s) => s.replace(/\r\n/g, "\n"))
    ),
    is_retry: z.optional(z.boolean()),
    selectedMcpServerNames: z.optional(z.array(z.string())),
    selectedMcpServers: z.optional(
      z.array(
        z.object({
          name: z.string(),
          url: z.string(),
          headers: z.optional(z.array(z.object({ key: z.string(), value: z.string() }))).default([])
        })
      )
    ).default([]),
    files: z.optional(
      z.array(
        z.object({
          type: z.literal("base64").or(z.literal("hash")),
          name: z.string(),
          value: z.string(),
          mime: z.string()
        })
      )
    )
  }).parse(JSON.parse(json));
  try {
    locals.mcp = {
      selectedServerNames: selectedMcpServerNames,
      selectedServers: (selectedMcpServers ?? []).map((s) => ({
        name: s.name,
        url: s.url,
        headers: s.headers && s.headers.length > 0 ? Object.fromEntries(s.headers.map((h) => [h.key, h.value])) : void 0
      }))
    };
  } catch {
  }
  const inputFiles = await Promise.all(
    form.getAll("files").filter((entry) => entry instanceof File && entry.size > 0).map(async (file) => {
      const [type, ...name] = file.name.split(";");
      return {
        type: z.literal("base64").or(z.literal("hash")).parse(type),
        value: await file.text(),
        mime: file.type,
        name: name.join(";")
      };
    })
  );
  if (usageLimits?.messageLength && (newPrompt?.length ?? 0) > usageLimits.messageLength) {
    error(400, "Message too long.");
  }
  const hashFiles = inputFiles?.filter((file) => file.type === "hash") ?? [];
  const b64Files = inputFiles?.filter((file) => file.type !== "hash").map((file) => {
    const blob = Buffer.from(file.value, "base64");
    return new File([blob], file.name, { type: file.mime });
  }) ?? [];
  if (b64Files.some((file) => file.size > 10 * 1024 * 1024)) {
    error(413, "File too large, should be <10MB");
  }
  const uploadedFiles = await Promise.all(b64Files.map((file) => uploadFile(file, conv))).then(
    (files) => [...files, ...hashFiles]
  );
  let messageToWriteToId = void 0;
  let messagesForPrompt = [];
  if (isRetry && messageId) {
    const messageToRetry = conv.messages.find((message) => message.id === messageId);
    if (!messageToRetry) {
      error(404, "Message not found");
    }
    if (messageToRetry.from === "user" && newPrompt) {
      const newUserMessageId = addSibling(
        conv,
        {
          from: "user",
          content: newPrompt,
          files: uploadedFiles,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        },
        messageId
      );
      messageToWriteToId = addChildren(
        conv,
        {
          from: "assistant",
          content: "",
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        },
        newUserMessageId
      );
      messagesForPrompt = buildSubtree(conv, newUserMessageId);
    } else if (messageToRetry.from === "assistant") {
      messageToWriteToId = addSibling(
        conv,
        { from: "assistant", content: "", createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() },
        messageId
      );
      messagesForPrompt = buildSubtree(conv, messageId);
      messagesForPrompt.pop();
    }
  } else {
    const newUserMessageId = addChildren(
      conv,
      {
        from: "user",
        content: newPrompt ?? "",
        files: uploadedFiles,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      },
      messageId
    );
    messageToWriteToId = addChildren(
      conv,
      {
        from: "assistant",
        content: "",
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      },
      newUserMessageId
    );
    messagesForPrompt = buildSubtree(conv, newUserMessageId);
  }
  const messageToWriteTo = conv.messages.find((message) => message.id === messageToWriteToId);
  if (!messageToWriteTo) {
    error(500, "Failed to create message");
  }
  if (messagesForPrompt.length === 0) {
    error(500, "Failed to create prompt");
  }
  await collections.conversations.updateOne(
    { _id: convId },
    { $set: { messages: conv.messages, title: conv.title, updatedAt: /* @__PURE__ */ new Date() } }
  );
  let doneStreaming = false;
  let clientDetached = false;
  let lastTokenTimestamp = void 0;
  let firstTokenObserved = false;
  const metricsEnabled = MetricsServer.isEnabled();
  const metrics = metricsEnabled ? MetricsServer.getMetrics() : void 0;
  const metricsModelId = model.id ?? model.name ?? conv.model;
  const metricsLabels = { model: metricsModelId };
  const persistConversation = async () => {
    const messagesForSave = conv.messages.map((msg) => {
      const filteredUpdates = msg.updates?.filter(
        (u) => !(u.type === MessageUpdateType.Status && u.status === MessageUpdateStatus.KeepAlive)
      ).map((u) => {
        if (u.type !== MessageUpdateType.Stream) return u;
        const len = u.len ?? (u.token ?? "").length;
        return { type: MessageUpdateType.Stream, token: "", len };
      }) ?? [];
      return { ...msg, updates: filteredUpdates };
    });
    await collections.conversations.updateOne(
      { _id: convId },
      { $set: { messages: messagesForSave, title: conv.title, updatedAt: /* @__PURE__ */ new Date() } }
    );
  };
  const abortRegistry = AbortRegistry.getInstance();
  const stream = new ReadableStream({
    async start(controller) {
      const conversationKey = convId.toString();
      const ctrl = new AbortController();
      abortRegistry.register(conversationKey, ctrl);
      let finalAnswerReceived = false;
      let abortedByUser = false;
      messageToWriteTo.updates ??= [];
      async function update(event) {
        if (!messageToWriteTo || !conv) {
          throw Error("No message or conversation to write events to");
        }
        if (event.type === MessageUpdateType.Stream) {
          if (event.token === "") return;
          messageToWriteTo.content += event.token;
          if (metricsEnabled && metrics) {
            const now = Date.now();
            metrics.model.tokenCountTotal.inc(metricsLabels);
            if (!firstTokenObserved) {
              metrics.model.timeToFirstToken.observe(metricsLabels, now - promptedAt.getTime());
              firstTokenObserved = true;
            }
            const previousTimestamp = lastTokenTimestamp ? lastTokenTimestamp.getTime() : promptedAt.getTime();
            metrics.model.timePerOutputToken.observe(metricsLabels, now - previousTimestamp);
          }
          lastTokenTimestamp = /* @__PURE__ */ new Date();
        } else if (event.type === MessageUpdateType.Reasoning && event.subtype === MessageReasoningUpdateType.Stream && "token" in event) {
          messageToWriteTo.reasoning ??= "";
          messageToWriteTo.reasoning += event.token;
        } else if (event.type === MessageUpdateType.Title) {
          const sanitizedTitle = event.title.replace(/<\/?think>/gi, "").trim();
          conv.title = sanitizedTitle;
          await collections.conversations.updateOne(
            { _id: convId },
            { $set: { title: conv?.title, updatedAt: /* @__PURE__ */ new Date() } }
          );
        } else if (event.type === MessageUpdateType.FinalAnswer) {
          messageToWriteTo.interrupted = event.interrupted;
          const hadTools = (messageToWriteTo.updates ?? []).some(
            (u) => u.type === MessageUpdateType.Tool
          );
          if (hadTools) {
            const existing = messageToWriteTo.content.slice(initialMessageContent.length);
            if (existing && existing.length > 0) {
              if (event.text && existing.endsWith(event.text)) {
                messageToWriteTo.content = initialMessageContent + existing;
              } else if (event.text && event.text.startsWith(existing)) {
                messageToWriteTo.content = initialMessageContent + event.text;
              } else {
                const needsGap = !/\n\n$/.test(existing) && !/^\n/.test(event.text ?? "");
                messageToWriteTo.content = initialMessageContent + existing + (needsGap ? "\n\n" : "") + (event.text ?? "");
              }
            } else {
              messageToWriteTo.content = initialMessageContent + (event.text ?? "");
            }
          } else {
            messageToWriteTo.content = initialMessageContent + event.text;
          }
          finalAnswerReceived = true;
          if (metricsEnabled && metrics) {
            metrics.model.latency.observe(metricsLabels, Date.now() - promptedAt.getTime());
          }
        } else if (event.type === MessageUpdateType.File) {
          messageToWriteTo.files = [
            ...messageToWriteTo.files ?? [],
            { type: "hash", name: event.name, value: event.sha, mime: event.mime }
          ];
        } else if (event.type === MessageUpdateType.RouterMetadata) {
          if (model?.isRouter) {
            messageToWriteTo.routerMetadata = {
              route: event.route || messageToWriteTo.routerMetadata?.route || "",
              model: event.model || messageToWriteTo.routerMetadata?.model || "",
              provider: event.provider || messageToWriteTo.routerMetadata?.provider
            };
          } else if (event.provider) {
            messageToWriteTo.routerMetadata = {
              route: messageToWriteTo.routerMetadata?.route || "",
              model: messageToWriteTo.routerMetadata?.model || "",
              provider: event.provider
            };
          }
        }
        if (!(event.type === MessageUpdateType.Status && event.status === MessageUpdateStatus.KeepAlive)) {
          messageToWriteTo?.updates?.push(
            event.type === MessageUpdateType.Stream ? { ...event } : event
          );
        }
        if (event.type === MessageUpdateType.Stream) {
          event = { ...event, token: event.token.padEnd(16, "\0") };
        }
        messageToWriteTo.updatedAt = /* @__PURE__ */ new Date();
        const enqueueUpdate = async () => {
          if (clientDetached) return;
          try {
            controller.enqueue(JSON.stringify(event) + "\n");
            if (event.type === MessageUpdateType.FinalAnswer) {
              controller.enqueue(" ".repeat(4096));
            }
          } catch (err) {
            clientDetached = true;
            logger.info(
              { conversationId: convId.toString() },
              "Client detached during message streaming"
            );
          }
        };
        await enqueueUpdate();
        if (clientDetached) {
          await persistConversation();
        }
      }
      let hasError = false;
      const initialMessageContent = messageToWriteTo.content;
      try {
        const userSettings = await collections.settings.findOne(authCondition(locals));
        locals.billingOrganization = userSettings?.billingOrganization;
        const ctx = {
          model,
          endpoint: await model.getEndpoint(),
          conv,
          messages: messagesForPrompt,
          assistant: void 0,
          promptedAt,
          ip: getClientAddress(),
          username: locals.user?.username,
          // Force-enable multimodal if user settings say so for this model
          forceMultimodal: Boolean(userSettings?.multimodalOverrides?.[model.id]),
          // Force-enable tools if user settings say so for this model
          forceTools: Boolean(userSettings?.toolsOverrides?.[model.id]),
          locals,
          abortController: ctrl
        };
        for await (const event of textGeneration(ctx)) await update(event);
        if (ctrl.signal.aborted) {
          abortedByUser = true;
        }
        if (abortedByUser && !finalAnswerReceived) {
          const partialText = messageToWriteTo.content.slice(initialMessageContent.length);
          await update({
            type: MessageUpdateType.FinalAnswer,
            text: partialText,
            interrupted: true
          });
        }
      } catch (e) {
        const err = e;
        const isAbortError = err?.name === "AbortError" || err?.name === "APIUserAbortError" || err?.message === "Request was aborted.";
        if (isAbortError || ctrl.signal.aborted) {
          abortedByUser = true;
          logger.info({ conversationId: conversationKey }, "Generation aborted by user");
          if (!finalAnswerReceived) {
            const partialText = messageToWriteTo.content.slice(initialMessageContent.length);
            await update({
              type: MessageUpdateType.FinalAnswer,
              text: partialText,
              interrupted: true
            });
          }
        } else {
          hasError = true;
          const errObj = err;
          const statusCode = (typeof errObj.statusCode === "number" ? errObj.statusCode : void 0) || (typeof errObj.status === "number" ? errObj.status : void 0);
          await update({
            type: MessageUpdateType.Status,
            status: MessageUpdateStatus.Error,
            message: err.message,
            ...statusCode && { statusCode }
          });
          logger.error(err);
        }
      } finally {
        if (!hasError && !abortedByUser && messageToWriteTo.content === initialMessageContent) {
          logger.warn(
            {
              conversationId: conversationKey,
              updatesCount: messageToWriteTo.updates?.length ?? 0,
              filesCount: messageToWriteTo.files?.length ?? 0,
              reasoningLen: messageToWriteTo.reasoning?.length ?? 0,
              initialLen: initialMessageContent.length,
              finalLen: messageToWriteTo.content.length
            },
            "No output generated after streaming; emitting error status"
          );
          await update({
            type: MessageUpdateType.Status,
            status: MessageUpdateStatus.Error,
            message: "No output was generated. Something went wrong."
          });
        }
      }
      await persistConversation();
      abortRegistry.unregister(conversationKey, ctrl);
      doneStreaming = true;
      if (!clientDetached) {
        controller.close();
      }
    },
    async cancel() {
      if (doneStreaming) return;
      clientDetached = true;
      await persistConversation();
    }
  });
  if (metricsEnabled && metrics) {
    metrics.model.messagesTotal.inc(metricsLabels);
  }
  return new Response(stream, {
    headers: {
      "Content-Type": "application/jsonl"
    }
  });
}
async function DELETE({ locals, params }) {
  const convId = new ObjectId(params.id);
  const conv = await collections.conversations.findOne({
    _id: convId,
    ...authCondition(locals)
  });
  if (!conv) {
    error(404, "Conversation not found");
  }
  await collections.conversations.deleteOne({ _id: conv._id });
  return new Response();
}
async function PATCH({ request, locals, params }) {
  const values = z.object({
    title: z.string().trim().min(1).max(100).optional(),
    model: validModelIdSchema.optional()
  }).parse(await request.json());
  const convId = new ObjectId(params.id);
  const conv = await collections.conversations.findOne({
    _id: convId,
    ...authCondition(locals)
  });
  if (!conv) {
    error(404, "Conversation not found");
  }
  const updateValues = {
    ...values.title !== void 0 && {
      title: values.title.replace(/<\/?think>/gi, "").trim()
    },
    ...values.model !== void 0 && { model: values.model }
  };
  await collections.conversations.updateOne(
    {
      _id: convId
    },
    {
      $set: updateValues
    }
  );
  return new Response();
}
export {
  DELETE,
  PATCH,
  POST
};
