import Elysia, { Elysia as Elysia$1, t, status } from "elysia";
import { b as authenticateRequest, a as authCondition, l as loginEnabled } from "../../../../../chunks/auth.js";
import { c as config } from "../../../../../chunks/config.js";
import { collections } from "../../../../../chunks/database.js";
import { ObjectId } from "mongodb";
import { v as validModelIdSchema, a as validateModel, d as defaultModel, m as models, r as refreshModels, l as lastModelRefreshSummary } from "../../../../../chunks/models.js";
import { c as convertLegacyConversation } from "../../../../../chunks/convertLegacyConversation.js";
import { C as CONV_NUM_PER_PAGE } from "../../../../../chunks/pagination.js";
import { D as DEFAULT_SETTINGS } from "../../../../../chunks/Settings.js";
import { z } from "zod";
import { l as logger } from "../../../../../chunks/logger.js";
import yazl from "yazl";
import { d as downloadFile } from "../../../../../chunks/downloadFile.js";
import mimeTypes from "mime-types";
import { v2 } from "cloudinary";
import { HfInference } from "@huggingface/inference";
import { GoogleGenAI } from "@google/genai";
import { b as base } from "../../../../../chunks/server.js";
import "@sveltejs/kit/internal/server";
import { swagger } from "@elysiajs/swagger";
import superjson from "superjson";
const authPlugin = new Elysia({ name: "auth" }).derive(
  { as: "scoped" },
  async ({
    headers,
    cookie,
    request
  }) => {
    const auth = await authenticateRequest(
      { type: "elysia", value: headers },
      { type: "elysia", value: cookie },
      new URL(request.url, config.PUBLIC_ORIGIN || void 0),
      true
    );
    return {
      locals: {
        user: auth?.user,
        sessionId: auth?.sessionId,
        isAdmin: auth?.isAdmin,
        token: auth?.token
      }
    };
  }
);
const conversationGroup = new Elysia$1().use(authPlugin).group("/conversations", (app2) => {
  return app2.guard({
    as: "scoped",
    beforeHandle: async ({ locals, set }) => {
      if (!locals.user?._id && !locals.sessionId) {
        set.status = 401;
        return { error: "Must have a valid session or user" };
      }
    }
  }).get(
    "",
    async ({ locals, query }) => {
      const pageSize = CONV_NUM_PER_PAGE;
      const convs = await collections.conversations.find(authCondition(locals)).project({
        title: 1,
        updatedAt: 1,
        model: 1
      }).sort({ updatedAt: -1 }).skip((query.p ?? 0) * pageSize).limit(pageSize + 1).toArray();
      const hasMore = convs.length > pageSize;
      const res = (hasMore ? convs.slice(0, pageSize) : convs).map((conv) => ({
        _id: conv._id,
        id: conv._id,
        // legacy param iOS
        title: conv.title,
        updatedAt: conv.updatedAt,
        model: conv.model,
        modelId: conv.model
        // legacy param iOS
      }));
      return { conversations: res, hasMore };
    },
    {
      query: t.Object({
        p: t.Optional(t.Number())
      })
    }
  ).delete("", async ({ locals }) => {
    const res = await collections.conversations.deleteMany({
      ...authCondition(locals)
    });
    return res.deletedCount;
  }).group(
    "/:id",
    {
      params: t.Object({
        id: t.String()
      })
    },
    (app22) => {
      return app22.derive(async ({ locals, params, query }) => {
        let conversation;
        let shared = false;
        if (params.id.length === 7) {
          conversation = await collections.sharedConversations.findOne({
            _id: params.id
          });
          shared = true;
          if (!conversation) {
            throw new Error("Conversation not found");
          }
        } else {
          try {
            new ObjectId(params.id);
          } catch {
            throw new Error("Invalid conversation ID format");
          }
          conversation = await collections.conversations.findOne({
            _id: new ObjectId(params.id),
            ...authCondition(locals)
          });
          if (!conversation) {
            const conversationExists = await collections.conversations.countDocuments({
              _id: new ObjectId(params.id)
            }) !== 0;
            if (conversationExists) {
              throw new Error(
                "You don't have access to this conversation. If someone gave you this link, ask them to use the 'share' feature instead."
              );
            }
            throw new Error("Conversation not found.");
          }
          if (query.fromShare && conversation.meta?.fromShareId === query.fromShare) {
            shared = true;
          }
        }
        const convertedConv = {
          ...conversation,
          ...convertLegacyConversation(conversation),
          shared
        };
        return { conversation: convertedConv };
      }).get(
        "",
        async ({ conversation }) => {
          return {
            messages: conversation.messages,
            title: conversation.title,
            model: conversation.model,
            preprompt: conversation.preprompt,
            rootMessageId: conversation.rootMessageId,
            id: conversation._id.toString(),
            updatedAt: conversation.updatedAt,
            modelId: conversation.model,
            shared: conversation.shared
          };
        },
        {
          query: t.Optional(
            t.Object({
              fromShare: t.Optional(t.String())
            })
          )
        }
      ).post("", () => {
        throw new Error("Not implemented");
      }).delete("", async ({ locals, params }) => {
        const res = await collections.conversations.deleteOne({
          _id: new ObjectId(params.id),
          ...authCondition(locals)
        });
        if (res.deletedCount === 0) {
          throw new Error("Conversation not found");
        }
        return { success: true };
      }).get("/output/:sha256", () => {
        throw new Error("Not implemented");
      }).post("/share", () => {
        throw new Error("Not implemented");
      }).post("/stop-generating", () => {
        throw new Error("Not implemented");
      }).patch(
        "",
        async ({ locals, params, body }) => {
          if (body.model) {
            if (!validModelIdSchema.safeParse(body.model).success) {
              throw new Error("Invalid model ID");
            }
          }
          const updateValues = {
            ...body.title !== void 0 && {
              title: body.title.replace(/<\/?think>/gi, "").trim()
            },
            ...body.model !== void 0 && { model: body.model }
          };
          const res = await collections.conversations.updateOne(
            {
              _id: new ObjectId(params.id),
              ...authCondition(locals)
            },
            {
              $set: updateValues
            }
          );
          if (typeof res.matchedCount === "number" ? res.matchedCount === 0 : res.modifiedCount === 0) {
            throw new Error("Conversation not found");
          }
          return { success: true };
        },
        {
          body: t.Object({
            title: t.Optional(
              t.String({
                minLength: 1,
                maxLength: 100
              })
            ),
            model: t.Optional(t.String())
          })
        }
      ).delete(
        "/message/:messageId",
        async ({ locals, params, conversation }) => {
          if (!conversation.messages.map((m) => m.id).includes(params.messageId)) {
            throw new Error("Message not found");
          }
          const filteredMessages = conversation.messages.filter(
            (message) => (
              // not the message AND the message is not in ancestors
              !(message.id === params.messageId) && message.ancestors && !message.ancestors.includes(params.messageId)
            )
          ).map((message) => {
            if (message.children && message.children.includes(params.messageId)) {
              message.children = message.children.filter(
                (child) => child !== params.messageId
              );
            }
            return message;
          });
          const res = await collections.conversations.updateOne(
            { _id: new ObjectId(conversation._id), ...authCondition(locals) },
            { $set: { messages: filteredMessages } }
          );
          if (res.modifiedCount === 0) {
            throw new Error("Deleting message failed");
          }
          return { success: true };
        },
        {
          params: t.Object({
            id: t.String(),
            messageId: t.String()
          })
        }
      );
    }
  );
});
const userGroup = new Elysia$1().use(authPlugin).get("/login", () => {
  throw new Error("Not implemented");
}).get("/login/callback", () => {
  throw new Error("Not implemented");
}).post("/logout", () => {
  throw new Error("Not implemented");
}).group("/user", (app2) => {
  return app2.get("/", ({ locals }) => {
    return locals.user ? {
      id: locals.user._id.toString(),
      username: locals.user.username,
      avatarUrl: locals.user.avatarUrl,
      email: locals.user.email,
      isAdmin: locals.user.isAdmin ?? false,
      isEarlyAccess: locals.user.isEarlyAccess ?? false
    } : null;
  }).get("/settings", async ({ locals }) => {
    const settings = await collections.settings.findOne(authCondition(locals));
    if (settings && !validateModel(models).safeParse(settings?.activeModel).success) {
      settings.activeModel = defaultModel.id;
      await collections.settings.updateOne(authCondition(locals), {
        $set: { activeModel: defaultModel.id }
      });
    }
    if (settings?.activeModel && models.find((m) => m.id === settings?.activeModel)?.unlisted === true) {
      settings.activeModel = defaultModel.id;
      await collections.settings.updateOne(authCondition(locals), {
        $set: { activeModel: defaultModel.id }
      });
    }
    return {
      welcomeModalSeen: !!settings?.welcomeModalSeenAt,
      welcomeModalSeenAt: settings?.welcomeModalSeenAt ?? null,
      activeModel: settings?.activeModel ?? DEFAULT_SETTINGS.activeModel,
      disableStream: settings?.disableStream ?? DEFAULT_SETTINGS.disableStream,
      directPaste: settings?.directPaste ?? DEFAULT_SETTINGS.directPaste,
      hidePromptExamples: settings?.hidePromptExamples ?? DEFAULT_SETTINGS.hidePromptExamples,
      shareConversationsWithModelAuthors: settings?.shareConversationsWithModelAuthors ?? DEFAULT_SETTINGS.shareConversationsWithModelAuthors,
      customPrompts: settings?.customPrompts ?? {},
      multimodalOverrides: settings?.multimodalOverrides ?? {},
      toolsOverrides: settings?.toolsOverrides ?? {},
      billingOrganization: settings?.billingOrganization ?? void 0
    };
  }).post("/settings", async ({ locals, request }) => {
    const body = await request.json();
    const { welcomeModalSeen, ...settings } = z.object({
      shareConversationsWithModelAuthors: z.boolean().default(DEFAULT_SETTINGS.shareConversationsWithModelAuthors),
      welcomeModalSeen: z.boolean().optional(),
      activeModel: z.string().default(DEFAULT_SETTINGS.activeModel),
      customPrompts: z.record(z.string()).default({}),
      multimodalOverrides: z.record(z.boolean()).default({}),
      toolsOverrides: z.record(z.boolean()).default({}),
      disableStream: z.boolean().default(false),
      directPaste: z.boolean().default(false),
      hidePromptExamples: z.record(z.boolean()).default({}),
      billingOrganization: z.string().optional()
    }).parse(body);
    await collections.settings.updateOne(
      authCondition(locals),
      {
        $set: {
          ...settings,
          ...welcomeModalSeen && { welcomeModalSeenAt: /* @__PURE__ */ new Date() },
          updatedAt: /* @__PURE__ */ new Date()
        },
        $setOnInsert: {
          createdAt: /* @__PURE__ */ new Date()
        }
      },
      {
        upsert: true
      }
    );
    return new Response();
  }).get("/reports", async ({ locals }) => {
    if (!locals.user || !locals.sessionId) {
      return [];
    }
    const reports = await collections.reports.find({
      createdBy: locals.user?._id ?? locals.sessionId
    }).toArray();
    return reports;
  }).get("/billing-orgs", async ({ locals, set }) => {
    if (!config.isHuggingChat) {
      set.status = 404;
      return { error: "Not available" };
    }
    if (!locals.user) {
      set.status = 401;
      return { error: "Login required" };
    }
    if (!locals.token) {
      set.status = 401;
      return { error: "OAuth token not available. Please log out and log back in." };
    }
    try {
      const response = await fetch("https://huggingface.co/oauth/userinfo", {
        headers: { Authorization: `Bearer ${locals.token}` }
      });
      if (!response.ok) {
        logger.error(`Failed to fetch billing orgs: ${response.status}`);
        set.status = 502;
        return { error: "Failed to fetch billing information" };
      }
      const data = await response.json();
      const settings = await collections.settings.findOne(authCondition(locals));
      const currentBillingOrg = settings?.billingOrganization;
      const billingOrgs = (data.orgs ?? []).filter((org) => org.canPay === true).map((org) => ({
        sub: org.sub,
        name: org.name,
        preferred_username: org.preferred_username
      }));
      const isCurrentOrgValid = !currentBillingOrg || billingOrgs.some(
        (org) => org.preferred_username === currentBillingOrg
      );
      if (!isCurrentOrgValid && currentBillingOrg) {
        logger.info(
          `Clearing invalid billingOrganization '${currentBillingOrg}' for user ${locals.user._id}`
        );
        await collections.settings.updateOne(authCondition(locals), {
          $unset: { billingOrganization: "" },
          $set: { updatedAt: /* @__PURE__ */ new Date() }
        });
      }
      return {
        userCanPay: data.canPay ?? false,
        organizations: billingOrgs,
        currentBillingOrg: isCurrentOrgValid ? currentBillingOrg : void 0
      };
    } catch (err) {
      logger.error("Error fetching billing orgs:", err);
      set.status = 500;
      return { error: "Internal server error" };
    }
  });
});
const misc = new Elysia$1().use(authPlugin).get("/public-config", async () => config.getPublicConfig()).get("/feature-flags", async ({ locals }) => {
  return {
    enableAssistants: config.ENABLE_ASSISTANTS === "true",
    loginEnabled,
    // login feature is on when OID is configured
    isAdmin: locals.isAdmin,
    transcriptionEnabled: !!config.get("TRANSCRIPTION_MODEL")
  };
}).get("/export", async ({ locals }) => {
  if (!locals.user) {
    throw new Error("Not logged in");
  }
  if (!locals.isAdmin) {
    throw new Error("Not admin");
  }
  if (config.ENABLE_DATA_EXPORT !== "true") {
    throw new Error("Data export is not enabled");
  }
  const nExports = await collections.messageEvents.countDocuments({
    userId: locals.user._id,
    type: "export",
    expiresAt: { $gt: /* @__PURE__ */ new Date() }
  });
  if (nExports >= 1) {
    throw new Error(
      "You have already exported your data recently. Please wait 1 hour before exporting again."
    );
  }
  const stats = {
    nConversations: 0,
    nMessages: 0,
    nFiles: 0,
    nAssistants: 0,
    nAvatars: 0
  };
  const zipfile = new yazl.ZipFile();
  const promises = [
    collections.conversations.find({ ...authCondition(locals) }).toArray().then(async (conversations) => {
      const formattedConversations = await Promise.all(
        conversations.map(async (conversation) => {
          stats.nConversations++;
          const hashes = [];
          conversation.messages.forEach(async (message) => {
            stats.nMessages++;
            if (message.files) {
              message.files.forEach((file) => {
                hashes.push(file.value);
              });
            }
          });
          const files = await Promise.all(
            hashes.map(async (hash) => {
              try {
                const fileData = await downloadFile(hash, conversation._id);
                return fileData;
              } catch {
                return null;
              }
            })
          );
          const filenames = [];
          files.forEach((file) => {
            if (!file) return;
            const extension = mimeTypes.extension(file.mime) || null;
            const convId = conversation._id.toString();
            const fileId = file.name.split("-")[1].slice(0, 8);
            const fileName = `file-${convId}-${fileId}` + (extension ? `.${extension}` : "");
            filenames.push(fileName);
            zipfile.addBuffer(Buffer.from(file.value, "base64"), fileName);
            stats.nFiles++;
          });
          return {
            ...conversation,
            messages: conversation.messages.map((message) => {
              return {
                ...message,
                files: filenames,
                updates: void 0
              };
            })
          };
        })
      );
      zipfile.addBuffer(
        Buffer.from(JSON.stringify(formattedConversations, null, 2)),
        "conversations.json"
      );
    }),
    collections.assistants.find({ createdById: locals.user._id }).toArray().then(async (assistants) => {
      const formattedAssistants = await Promise.all(
        assistants.map(async (assistant) => {
          if (assistant.avatar) {
            const fileId = collections.bucket.find({ filename: assistant._id.toString() });
            const content = await fileId.next().then(async (file) => {
              if (!file?._id) return;
              const fileStream = collections.bucket.openDownloadStream(file?._id);
              const fileBuffer = await new Promise((resolve, reject) => {
                const chunks = [];
                fileStream.on("data", (chunk) => chunks.push(chunk));
                fileStream.on("error", reject);
                fileStream.on("end", () => resolve(Buffer.concat(chunks)));
              });
              return fileBuffer;
            });
            if (!content) return;
            zipfile.addBuffer(content, `avatar-${assistant._id.toString()}.jpg`);
            stats.nAvatars++;
          }
          stats.nAssistants++;
          return {
            _id: assistant._id.toString(),
            name: assistant.name,
            createdById: assistant.createdById.toString(),
            createdByName: assistant.createdByName,
            avatar: `avatar-${assistant._id.toString()}.jpg`,
            modelId: assistant.modelId,
            preprompt: assistant.preprompt,
            description: assistant.description,
            dynamicPrompt: assistant.dynamicPrompt,
            exampleInputs: assistant.exampleInputs,
            generateSettings: assistant.generateSettings,
            createdAt: assistant.createdAt.toISOString(),
            updatedAt: assistant.updatedAt.toISOString()
          };
        })
      );
      zipfile.addBuffer(
        Buffer.from(JSON.stringify(formattedAssistants, null, 2)),
        "assistants.json"
      );
    })
  ];
  Promise.all(promises).then(async () => {
    logger.info(
      {
        userId: locals.user?._id,
        ...stats
      },
      "Exported user data"
    );
    zipfile.end();
    if (locals.user?._id) {
      await collections.messageEvents.insertOne({
        userId: locals.user?._id,
        type: "export",
        createdAt: /* @__PURE__ */ new Date(),
        expiresAt: new Date(Date.now() + 1e3 * 60 * 60)
        // 1 hour
      });
    }
  });
  return new Response(zipfile.outputStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="export.zip"'
    }
  });
});
const modelGroup = new Elysia$1().group(
  "/models",
  (app2) => app2.get("/", async () => {
    try {
      const { models: models2 } = await import("../../../../../chunks/models.js").then((n) => n.n);
      return models2.filter((m) => m.unlisted == false).map((model) => ({
        id: model.id,
        name: model.name,
        websiteUrl: model.websiteUrl,
        modelUrl: model.modelUrl,
        datasetName: model.datasetName,
        datasetUrl: model.datasetUrl,
        displayName: model.displayName,
        description: model.description,
        logoUrl: model.logoUrl,
        providers: model.providers,
        promptExamples: model.promptExamples,
        parameters: model.parameters,
        preprompt: model.preprompt,
        multimodal: model.multimodal,
        multimodalAcceptedMimetypes: model.multimodalAcceptedMimetypes,
        supportsTools: model.supportsTools ?? false,
        unlisted: model.unlisted,
        hasInferenceAPI: model.hasInferenceAPI,
        isRouter: model.isRouter
      }));
    } catch (e) {
      return [];
    }
  }).get("/old", async () => {
    return [];
  }).group(
    "/refresh",
    (app22) => app22.use(authPlugin).post("", async ({ locals }) => {
      if (!locals.user && !locals.sessionId) {
        throw status(401, "Unauthorized");
      }
      if (!locals.isAdmin) {
        throw status(403, "Admin privileges required");
      }
      const previous = lastModelRefreshSummary;
      try {
        const summary = await refreshModels();
        return {
          refreshedAt: summary.refreshedAt.toISOString(),
          durationMs: summary.durationMs,
          added: summary.added,
          removed: summary.removed,
          changed: summary.changed,
          total: summary.total,
          hadChanges: summary.added.length > 0 || summary.removed.length > 0 || summary.changed.length > 0,
          previous: previous.refreshedAt.getTime() > 0 ? {
            refreshedAt: previous.refreshedAt.toISOString(),
            total: previous.total
          } : null
        };
      } catch (err) {
        throw status(502, "Model refresh failed");
      }
    })
  ).group(
    "/:namespace/:model?",
    (app22) => app22.derive(async ({ params, error }) => {
      let modelId = params.namespace;
      if (params.model) {
        modelId += "/" + params.model;
      }
      try {
        const { models: models2 } = await import("../../../../../chunks/models.js").then((n) => n.n);
        const model = models2.find((m) => m.id === modelId);
        if (!model || model.unlisted) {
          return error(404, "Model not found");
        }
        return { model };
      } catch (e) {
        return error(500, "Models not available");
      }
    }).get("/", ({ model }) => {
      return model;
    }).use(authPlugin).post("/subscribe", async ({ locals, model, error }) => {
      if (!locals.sessionId) {
        return error(401, "Unauthorized");
      }
      await collections.settings.updateOne(
        authCondition(locals),
        {
          $set: {
            activeModel: model.id,
            updatedAt: /* @__PURE__ */ new Date()
          },
          $setOnInsert: {
            createdAt: /* @__PURE__ */ new Date()
          }
        },
        {
          upsert: true
        }
      );
      return new Response();
    })
  )
);
const debugGroup = new Elysia$1().group(
  "/debug",
  (app2) => app2.get("/config", async () => {
    const { models: models2 } = await import("../../../../../chunks/models.js").then((n) => n.n);
    return {
      OPENAI_BASE_URL: config.OPENAI_BASE_URL,
      OPENAI_API_KEY_SET: Boolean(config.OPENAI_API_KEY || config.HF_TOKEN),
      LEGACY_HF_TOKEN_SET: Boolean(config.HF_TOKEN && !config.OPENAI_API_KEY),
      MODELS_COUNT: models2.length,
      NODE_VERSION: process.versions.node
    };
  }).get("/refresh", async () => {
    const base2 = (config.OPENAI_BASE_URL || "https://router.huggingface.co/v1").replace(
      /\/$/,
      ""
    );
    const res = await fetch(`${base2}/models`);
    const body = await res.text();
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch (_err) {
      parsed = void 0;
    }
    return {
      status: res.status,
      ok: res.ok,
      base: base2,
      length: (() => {
        if (parsed && typeof parsed === "object" && "data" in parsed) {
          const data = parsed.data;
          return Array.isArray(data) ? data.length : null;
        }
        return null;
      })(),
      sample: body.slice(0, 2e3)
    };
  })
);
v2.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET
});
async function uploadImageToCloudinary(imageBuffer, options) {
  return new Promise((resolve, reject) => {
    const uploadStream = v2.uploader.upload_stream(
      {
        folder: options?.folder || "chat-ui/generated-images",
        public_id: options?.public_id,
        tags: options?.tags || ["flux", "generated"],
        resource_type: "image"
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height
          });
        } else {
          reject(new Error("Upload failed: no result returned"));
        }
      }
    );
    uploadStream.end(imageBuffer);
  });
}
async function deleteImageFromCloudinary(publicId) {
  await v2.uploader.destroy(publicId);
}
async function uploadVideoToCloudinary(videoBuffer, options) {
  return new Promise((resolve, reject) => {
    const uploadStream = v2.uploader.upload_stream(
      {
        folder: options?.folder,
        public_id: options?.public_id,
        tags: options?.tags || ["video", "generated"],
        resource_type: "video"
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            duration: result.duration
          });
        } else {
          reject(new Error("Upload failed: no result returned"));
        }
      }
    );
    uploadStream.end(videoBuffer);
  });
}
const MODELS = {
  "black-forest-labs/FLUX.1-schnell": "FLUX.1-schnell (Fast & High Quality)",
  "stabilityai/stable-diffusion-xl-base-1.0": "Stable Diffusion XL (Open Source Leader)",
  "ByteDance/SDXL-Lightning": "SDXL-Lightning (Ultra Fast)",
  "stabilityai/stable-diffusion-2-1": "Stable Diffusion 2.1 (Lightweight)",
  "playgroundai/playground-v2.5-1024px-aesthetic": "Playground v2.5 (Aesthetic Focused)"
};
const FLUX_MODEL_ID = "black-forest-labs/FLUX.1-schnell";
const imageGroup = new Elysia$1().group(
  "/images",
  (app2) => app2.use(authPlugin).get("/google/models", async ({ locals, set }) => {
    if (!locals.user) {
      set.status = 401;
      return { error: "Authentication required" };
    }
    const apiKey = config.GEMINI_API_KEY;
    if (!apiKey) {
      set.status = 500;
      return { error: "GEMINI_API_KEY not configured" };
    }
    try {
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/models", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "x-goog-api-key": apiKey
        }
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        set.status = 502;
        return { error: `Failed to fetch Google models (${res.status}): ${text}` };
      }
      const json = await res.json();
      const models2 = Array.isArray(json.data) ? json.data : [];
      models2.sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
      return {
        models: models2.map((m) => ({
          id: m.id,
          created: m.created
        }))
      };
    } catch (error) {
      logger.error({ error: String(error) }, "Failed to fetch Google models");
      set.status = 502;
      return { error: "Failed to fetch Google models" };
    }
  }).post("/google/generate", async ({ locals, body, set }) => {
    const { prompt, model, referenceImage } = body;
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      set.status = 400;
      return { error: "Prompt is required" };
    }
    if (prompt.length > 500) {
      set.status = 400;
      return { error: "Prompt is too long (max 500 characters)" };
    }
    if (!locals.user) {
      set.status = 401;
      return { error: "Authentication required" };
    }
    const apiKey = config.GEMINI_API_KEY;
    if (!apiKey) {
      set.status = 500;
      return { success: false, error: "GEMINI_API_KEY not configured" };
    }
    const selectedModel = model && typeof model === "string" && model.trim().length > 0 ? model.trim() : "gemini-2.5-flash-image";
    const selectedModelId = selectedModel.replace(/^models\//, "");
    let referenceImageClean;
    if (referenceImage && typeof referenceImage === "object") {
      const mimeType = referenceImage.mimeType;
      const dataRaw = referenceImage.data;
      if (typeof mimeType !== "string" || !mimeType.startsWith("image/")) {
        set.status = 400;
        return { success: false, error: "Invalid referenceImage.mimeType" };
      }
      if (typeof dataRaw !== "string" || dataRaw.trim().length === 0) {
        set.status = 400;
        return { success: false, error: "Invalid referenceImage.data" };
      }
      const cleaned = dataRaw.includes(",") ? dataRaw.split(",").pop() ?? "" : dataRaw;
      referenceImageClean = {
        mimeType,
        data: cleaned.trim()
      };
    }
    try {
      logger.info(
        { userId: locals.user._id, prompt, model: selectedModel },
        "Generating image (Google)"
      );
      const requestParts = [{ text: prompt.trim() }];
      if (referenceImageClean) {
        requestParts.push({
          inline_data: {
            mime_type: referenceImageClean.mimeType,
            data: referenceImageClean.data
          }
        });
      }
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          selectedModelId
        )}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },
          body: JSON.stringify({
            contents: [
              {
                parts: requestParts
              }
            ],
            generationConfig: {
              responseModalities: ["TEXT", "IMAGE"]
            }
          })
        }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        set.status = 502;
        return {
          success: false,
          error: `Google image generation failed (${res.status}): ${text}`
        };
      }
      const json = await res.json();
      const responseParts = json.candidates?.[0]?.content?.parts ?? [];
      const imagePart = responseParts.find((p) => p.inlineData?.data);
      if (!imagePart?.inlineData?.data) {
        set.status = 502;
        return {
          success: false,
          error: "Google image generation returned no image data"
        };
      }
      const imageBuffer = Buffer.from(imagePart.inlineData.data, "base64");
      const tags = ["google", "generated", locals.user._id.toString()];
      const cloudinaryResult = await uploadImageToCloudinary(imageBuffer, {
        folder: "chat-ui/generated-images",
        tags
      });
      const generatedImageId = new ObjectId();
      const imageDoc = {
        _id: generatedImageId,
        userId: locals.user._id,
        prompt: prompt.trim(),
        cloudinaryUrl: cloudinaryResult.url,
        cloudinaryPublicId: cloudinaryResult.publicId,
        width: cloudinaryResult.width,
        height: cloudinaryResult.height,
        modelUsed: selectedModelId,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      };
      await collections.generatedImages.insertOne(imageDoc);
      return {
        success: true,
        image: {
          _id: generatedImageId.toString(),
          url: cloudinaryResult.url,
          prompt: imageDoc.prompt,
          modelUsed: imageDoc.modelUsed,
          width: imageDoc.width,
          height: imageDoc.height,
          createdAt: imageDoc.createdAt
        }
      };
    } catch (error) {
      logger.error({ error: String(error) }, "Google image generation failed");
      set.status = 500;
      return { success: false, error: "Failed to generate image: " + String(error) };
    }
  }).post("/generate", async ({ locals, body, set }) => {
    const { prompt, model } = body;
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      set.status = 400;
      return { error: "Prompt is required" };
    }
    if (prompt.length > 500) {
      set.status = 400;
      return { error: "Prompt is too long (max 500 characters)" };
    }
    if (!locals.user) {
      set.status = 401;
      return { error: "Authentication required" };
    }
    const selectedModel = model && Object.keys(MODELS).includes(model) ? model : FLUX_MODEL_ID;
    try {
      const apiToken = config.OPENAI_API_KEY || config.HF_TOKEN;
      if (!apiToken) {
        throw new Error("HF_TOKEN not configured in .env");
      }
      logger.info({ userId: locals.user._id, prompt, model: selectedModel }, "Generating image");
      const hf = new HfInference(apiToken);
      const imageBlob = await hf.textToImage({
        model: selectedModel,
        inputs: prompt.trim()
      });
      const imageBuffer = Buffer.from(await imageBlob.arrayBuffer());
      const tags = ["flux", "generated"];
      if (locals.user) {
        tags.push(locals.user._id.toString());
      }
      const cloudinaryResult = await uploadImageToCloudinary(imageBuffer, {
        folder: "chat-ui/generated-images",
        tags
      });
      const generatedImageId = new ObjectId();
      const imageDoc = {
        _id: generatedImageId,
        userId: locals.user._id,
        prompt: prompt.trim(),
        cloudinaryUrl: cloudinaryResult.url,
        cloudinaryPublicId: cloudinaryResult.publicId,
        width: cloudinaryResult.width,
        height: cloudinaryResult.height,
        modelUsed: selectedModel,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      };
      await collections.generatedImages.insertOne(imageDoc);
      logger.info("Image generated and saved to MongoDB");
      return {
        success: true,
        image: {
          _id: generatedImageId.toString(),
          url: cloudinaryResult.url,
          prompt: imageDoc.prompt,
          modelUsed: imageDoc.modelUsed,
          width: imageDoc.width,
          height: imageDoc.height,
          createdAt: imageDoc.createdAt
        }
      };
    } catch (error) {
      logger.error({ error: String(error) }, "Image generation failed");
      set.status = 500;
      return { success: false, error: "Failed to generate image: " + String(error) };
    }
  }).get("/", async ({ locals, query, set }) => {
    if (!locals.user) {
      set.status = 401;
      return { error: "Authentication required" };
    }
    const page = parseInt(query.page || "0", 10);
    const limit = Math.min(parseInt(query.limit || "100", 10), 100);
    try {
      const images = await collections.generatedImages.find({ userId: locals.user._id }).sort({ createdAt: -1 }).skip(page * limit).limit(limit).toArray();
      const total = await collections.generatedImages.countDocuments({
        userId: locals.user._id
      });
      return {
        images: images.map((img) => ({
          _id: img._id,
          prompt: img.prompt,
          url: img.cloudinaryUrl,
          width: img.width,
          height: img.height,
          modelUsed: img.modelUsed,
          createdAt: img.createdAt
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error({ error: String(error) }, "Failed to fetch images");
      set.status = 500;
      return { error: "Failed to fetch images" };
    }
  }).delete("/:imageId", async ({ locals, params, set }) => {
    if (!locals.user) {
      set.status = 401;
      return { error: "Authentication required" };
    }
    const imageId = params.imageId;
    if (!ObjectId.isValid(imageId)) {
      set.status = 400;
      return { error: "Invalid image ID" };
    }
    try {
      const image = await collections.generatedImages.findOne({
        _id: new ObjectId(imageId),
        userId: locals.user._id
      });
      if (!image) {
        set.status = 404;
        return { error: "Image not found" };
      }
      await deleteImageFromCloudinary(image.cloudinaryPublicId);
      await collections.generatedImages.deleteOne({
        _id: new ObjectId(imageId)
      });
      logger.info("Image deleted successfully");
      return { success: true };
    } catch (error) {
      logger.error({ error: String(error) }, "Failed to delete image");
      set.status = 500;
      return { error: "Failed to delete image" };
    }
  })
);
const ALLOWED_VEO_MODELS = /* @__PURE__ */ new Set(["veo-3.1-generate-preview", "veo-3.1-fast-generate-preview"]);
const videoGroup = new Elysia$1().group(
  "/videos",
  (app2) => app2.use(authPlugin).post("/google/generate", async ({ locals, body, set }) => {
    const { prompt, model, mode, referenceImage } = body;
    if (!locals.user) {
      set.status = 401;
      return { error: "Authentication required" };
    }
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      set.status = 400;
      return { success: false, error: "Prompt is required" };
    }
    if (prompt.length > 1200) {
      set.status = 400;
      return { success: false, error: "Prompt is too long (max 1200 characters)" };
    }
    const apiKey = config.GEMINI_API_KEY;
    if (!apiKey) {
      set.status = 500;
      return { success: false, error: "GEMINI_API_KEY not configured" };
    }
    const selectedModel = model && typeof model === "string" && ALLOWED_VEO_MODELS.has(model.trim()) ? model.trim() : "veo-3.1-generate-preview";
    const selectedMode = mode === "image-to-video" ? "image-to-video" : "text-to-video";
    let referenceImageClean;
    if (selectedMode === "image-to-video") {
      if (!referenceImage || typeof referenceImage !== "object") {
        set.status = 400;
        return { success: false, error: "referenceImage is required for image-to-video" };
      }
      const mimeType = referenceImage.mimeType;
      const dataRaw = referenceImage.data;
      if (typeof mimeType !== "string" || !mimeType.startsWith("image/")) {
        set.status = 400;
        return { success: false, error: "Invalid referenceImage.mimeType" };
      }
      if (mimeType !== "image/jpeg" && mimeType !== "image/png") {
        set.status = 400;
        return {
          success: false,
          error: "Unsupported reference image type. Please use PNG or JPEG."
        };
      }
      if (typeof dataRaw !== "string" || dataRaw.trim().length === 0) {
        set.status = 400;
        return { success: false, error: "Invalid referenceImage.data" };
      }
      const cleaned = dataRaw.includes(",") ? dataRaw.split(",").pop() ?? "" : dataRaw;
      referenceImageClean = {
        mimeType,
        data: cleaned.trim()
      };
    }
    try {
      logger.info(
        { userId: locals.user._id, prompt, model: selectedModel, mode: selectedMode },
        "Generating video (Google Veo)"
      );
      const ai = new GoogleGenAI({ apiKey });
      let operation = await ai.models.generateVideos({
        model: selectedModel,
        prompt: prompt.trim(),
        ...referenceImageClean ? {
          image: {
            imageBytes: referenceImageClean.data,
            mimeType: referenceImageClean.mimeType
          }
        } : {},
        config: {
          numberOfVideos: 1,
          aspectRatio: "16:9",
          resolution: "720p",
          ...referenceImageClean ? { personGeneration: "allow_adult" } : {}
        }
      });
      const maxPolls = 90;
      let polls = 0;
      while (!operation.done) {
        polls += 1;
        if (polls > maxPolls) {
          set.status = 504;
          return { success: false, error: "Video generation timed out" };
        }
        await new Promise((r) => setTimeout(r, 1e4));
        operation = await ai.operations.getVideosOperation({ operation });
      }
      const videoObj = operation?.response?.generatedVideos?.[0]?.video;
      const uri = typeof videoObj?.uri === "string" ? videoObj.uri : "";
      if (!uri) {
        set.status = 502;
        return { success: false, error: "No generated video URI returned" };
      }
      const videoUri = decodeURIComponent(uri);
      const headers = { "x-goog-api-key": apiKey };
      let videoRes = await fetch(videoUri, { headers });
      if (!videoRes.ok) {
        const fallbackUri = `${videoUri}${videoUri.includes("?") ? "&" : "?"}key=${apiKey}`;
        videoRes = await fetch(fallbackUri, { headers });
      }
      if (!videoRes.ok) {
        const text = await videoRes.text().catch(() => "");
        set.status = 502;
        return { success: false, error: `Failed to fetch generated video: ${text}` };
      }
      const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
      const tags = ["google", "veo", locals.user._id.toString()];
      const cloudinaryResult = await uploadVideoToCloudinary(videoBuffer, {
        folder: "chat-ui/generated-videos",
        tags
      });
      const generatedVideoId = new ObjectId();
      const videoDoc = {
        _id: generatedVideoId,
        userId: locals.user._id,
        prompt: prompt.trim(),
        cloudinaryUrl: cloudinaryResult.url,
        cloudinaryPublicId: cloudinaryResult.publicId,
        modelUsed: selectedModel,
        mode: selectedMode,
        width: cloudinaryResult.width,
        height: cloudinaryResult.height,
        duration: cloudinaryResult.duration,
        operationName: operation?.name,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      };
      await collections.generatedVideos.insertOne(videoDoc);
      return {
        success: true,
        video: {
          _id: generatedVideoId.toString(),
          url: cloudinaryResult.url,
          prompt: videoDoc.prompt,
          modelUsed: videoDoc.modelUsed,
          mode: videoDoc.mode,
          width: videoDoc.width,
          height: videoDoc.height,
          duration: videoDoc.duration,
          createdAt: videoDoc.createdAt
        }
      };
    } catch (error) {
      logger.error({ error: String(error) }, "Google video generation failed");
      set.status = 500;
      return { success: false, error: "Failed to generate video: " + String(error) };
    }
  }).get("/", async ({ locals, query, set }) => {
    if (!locals.user) {
      set.status = 401;
      return { error: "Authentication required" };
    }
    const page = parseInt(query.page || "0", 10);
    const limit = Math.min(parseInt(query.limit || "50", 10), 100);
    try {
      const videos = await collections.generatedVideos.find({ userId: locals.user._id }).sort({ createdAt: -1 }).skip(page * limit).limit(limit).toArray();
      const total = await collections.generatedVideos.countDocuments({ userId: locals.user._id });
      return {
        videos: videos.map((v) => ({
          _id: v._id,
          prompt: v.prompt,
          url: v.cloudinaryUrl,
          modelUsed: v.modelUsed,
          mode: v.mode,
          width: v.width,
          height: v.height,
          duration: v.duration,
          createdAt: v.createdAt
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error({ error: String(error) }, "Failed to fetch videos");
      set.status = 500;
      return { error: "Failed to fetch videos" };
    }
  })
);
const prefix = `${base}/api/v2`;
const app = new Elysia$1({ prefix }).mapResponse(({ response, request }) => {
  if (request.url.endsWith("/export")) {
    return response;
  }
  return new Response(superjson.stringify(response), {
    headers: {
      "Content-Type": "application/json"
    }
  });
}).use(
  swagger({
    documentation: {
      info: {
        title: "chat-ui API",
        version: config.PUBLIC_VERSION
      }
    },
    provider: "swagger-ui",
    path: `swagger`
  })
).use(authPlugin).use(conversationGroup).use(userGroup).use(modelGroup).use(misc).use(debugGroup).use(imageGroup).use(videoGroup);
const GET = ({ request }) => app.handle(request);
const POST = ({ request }) => app.handle(request);
const PUT = ({ request }) => app.handle(request);
const PATCH = ({ request }) => app.handle(request);
const DELETE = ({ request }) => app.handle(request);
export {
  DELETE,
  GET,
  PATCH,
  POST,
  PUT
};
