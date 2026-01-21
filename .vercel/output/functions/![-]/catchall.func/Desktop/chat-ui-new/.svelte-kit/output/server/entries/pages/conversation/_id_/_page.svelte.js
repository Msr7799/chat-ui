import { g as bind_props, k as head, f as store_get, u as unsubscribe_stores, l as store_set } from "../../../../chunks/index2.js";
import { C as ChatWindow, f as findCurrentModel, a as file2base64, b as fetchMessageUpdates } from "../../../../chunks/models2.js";
import { e as escape_html } from "../../../../chunks/escaping.js";
import "clsx";
import { w as writable } from "../../../../chunks/index.js";
import { p as page } from "../../../../chunks/index3.js";
import { i as invalidateAll } from "../../../../chunks/client.js";
import { b as base } from "../../../../chunks/server.js";
import "@sveltejs/kit/internal/server";
import { e as error, E as ERROR_MESSAGES } from "../../../../chunks/errors.js";
import { M as MessageUpdateType, c as MessageUpdateStatus } from "../../../../chunks/MessageUpdate.js";
import { a as addSibling, b as addChildren } from "../../../../chunks/addSibling.js";
import { u as useSettingsStore } from "../../../../chunks/settings2.js";
import { r as requireAuthUser, f as enabledServers } from "../../../../chunks/shareModal.js";
import { M as Modal } from "../../../../chunks/Modal.js";
import { l as loading } from "../../../../chunks/loading.js";
const isAborted = writable(false);
const titleUpdate = writable(null);
class UpdateDebouncer {
  constructor() {
    this.renderStartedAt = null;
    this.lastRenderTimes = [];
  }
  get maxUpdateTime() {
    if (this.lastRenderTimes.length === 0) {
      return 50;
    }
    const averageTime = this.lastRenderTimes.reduce((acc, time) => acc + time, 0) / this.lastRenderTimes.length;
    return Math.min(averageTime * 3, 500);
  }
  startRender() {
    this.renderStartedAt = /* @__PURE__ */ new Date();
  }
  endRender() {
    if (!this.renderStartedAt) {
      return;
    }
    const timeSinceRenderStarted = (/* @__PURE__ */ new Date()).getTime() - this.renderStartedAt.getTime();
    this.lastRenderTimes.push(timeSinceRenderStarted);
    if (this.lastRenderTimes.length > 10) {
      this.lastRenderTimes.shift();
    }
    this.renderStartedAt = null;
  }
}
const updateDebouncer = new UpdateDebouncer();
function SubscribeModal($$renderer, $$props) {
  let { close } = $$props;
  Modal($$renderer, {
    closeOnBackdrop: false,
    onclose: close,
    width: "!max-w-[420px] !m-4",
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="flex w-full flex-col gap-8 bg-white bg-gradient-to-b to-transparent px-6 pb-7 dark:bg-black dark:from-white/10 dark:to-white/5"><div class="-mx-6 grid h-48 select-none place-items-center bg-gradient-to-t from-black/5 dark:from-white/10"><div class="flex flex-col items-center justify-center gap-2.5 px-8 text-center"><div class="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-pink-500/15 from-15% via-green-500/15 to-yellow-500/15 text-3xl"><svg width="1em" height="1em" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.48 1.26001C6.48 2.81001 7.15 3.84001 7.98 4.50001C8.84 5.18001 9.88 5.50001 10.56 5.57001V6.43001C9.6233 6.5513 8.73602 6.92071 7.99 7.50001C7.50131 7.88332 7.10989 8.37647 6.84753 8.93943C6.58516 9.50238 6.45925 10.1193 6.48 10.74H5.52C5.52 9.19001 4.85 8.16001 4.02 7.50001C3.27114 6.91907 2.3802 6.54958 1.44 6.43001V5.57001C2.37671 5.44872 3.26398 5.07931 4.01 4.50001C4.4987 4.1167 4.89011 3.62355 5.15248 3.06059C5.41484 2.49764 5.54076 1.88075 5.52 1.26001H6.48Z" fill="url(#paint0_linear_141_2)"></path><defs><linearGradient id="paint0_linear_141_2" x1="3.37" y1="3.43001" x2="8.14" y2="8.90001" gradientUnits="userSpaceOnUse"><stop stop-color="#FF0789"></stop><stop offset="0.63" stop-color="#21DE75"></stop><stop offset="1" stop-color="#FF8D00"></stop></linearGradient></defs></svg></div> <h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Upgrade Required</h2></div></div> <div class="text-gray-700 dark:text-gray-200"><p class="text-[15px] leading-relaxed">You've reached your message limit. Upgrade to Hugging Face PRO to continue using
				HuggingChat.</p> <p class="mt-3 text-[15px] italic leading-relaxed opacity-75">It's also possible to use your PRO credits in your favorite AI tools.</p></div> <div class="flex flex-col gap-2.5"><a href="https://huggingface.co/subscribe/pro?from=HuggingChat" target="_blank" rel="noopener noreferrer" class="w-full rounded-xl bg-black px-5 py-2.5 text-center text-base font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200">Upgrade to Pro</a> <button class="w-full rounded-xl bg-gray-200 px-5 py-2.5 text-base font-medium text-gray-700 hover:bg-gray-300/80 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10">Maybe later</button></div></div>`);
    }
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { data = void 0 } = $$props;
    let pending = false;
    let initialRun = true;
    let showSubscribeModal = false;
    let files = [];
    let conversations = data.conversations;
    function createMessagesPath(messages2, msgId) {
      if (initialRun) {
        if (!msgId && page.url.searchParams.get("leafId")) {
          msgId = page.url.searchParams.get("leafId");
          page.url.searchParams.delete("leafId");
        }
        initialRun = false;
      }
      const msg = messages2.find((msg2) => msg2.id === msgId) ?? messages2.at(-1);
      if (!msg) return [];
      const { ancestors } = msg;
      const path = [];
      if (ancestors?.length) {
        for (const ancestorId of ancestors) {
          const ancestor = messages2.find((msg2) => msg2.id === ancestorId);
          if (ancestor) {
            path.push(ancestor);
          }
        }
      }
      path.push(msg);
      let childrenIds = msg.children;
      while (childrenIds?.length) {
        let lastChildId = childrenIds.at(-1);
        const lastChild = messages2.find((msg2) => msg2.id === lastChildId);
        if (lastChild) {
          path.push(lastChild);
        }
        childrenIds = lastChild?.children;
      }
      return path;
    }
    function createMessagesAlternatives(messages2) {
      const alternatives = [];
      for (const message of messages2) {
        if (message.children?.length) {
          alternatives.push(message.children);
        }
      }
      return alternatives;
    }
    async function writeMessage({
      prompt,
      messageId = messagesPath.at(-1)?.id ?? void 0,
      isRetry = false
    }) {
      try {
        store_set(isAborted, false);
        store_set(loading, true);
        pending = true;
        const base64Files = await Promise.all((files ?? []).map((file) => file2base64(file).then((value) => ({ type: "base64", value, mime: file.type, name: file.name }))));
        let messageToWriteToId = void 0;
        if (isRetry && messageId) {
          const messageToRetry = messages.find((message) => message.id === messageId);
          if (!messageToRetry) {
            store_set(error, "Message not found");
          }
          if (messageToRetry?.from === "user" && prompt) {
            const newUserMessageId = addSibling({ messages, rootMessageId: data.rootMessageId }, { from: "user", content: prompt, files: messageToRetry.files }, messageId);
            messageToWriteToId = addChildren({ messages, rootMessageId: data.rootMessageId }, { from: "assistant", content: "" }, newUserMessageId);
          } else if (messageToRetry?.from === "assistant") {
            messageToWriteToId = addSibling({ messages, rootMessageId: data.rootMessageId }, { from: "assistant", content: "" }, messageId);
          }
        } else {
          const newUserMessageId = addChildren({ messages, rootMessageId: data.rootMessageId }, { from: "user", content: prompt ?? "", files: base64Files }, messageId);
          if (!data.rootMessageId) {
            data.rootMessageId = newUserMessageId;
          }
          messageToWriteToId = addChildren({ messages, rootMessageId: data.rootMessageId }, { from: "assistant", content: "" }, newUserMessageId);
        }
        const userMessage = messages.find((message) => message.id === messageId);
        const messageToWriteTo = messages.find((message) => message.id === messageToWriteToId);
        if (!messageToWriteTo) {
          throw new Error("Message to write to not found");
        }
        const messageUpdatesAbortController = new AbortController();
        const messageUpdatesIterator = await fetchMessageUpdates(
          page.params.id,
          {
            base,
            inputs: prompt,
            messageId,
            isRetry,
            files: isRetry ? userMessage?.files : base64Files,
            selectedMcpServerNames: store_get($$store_subs ??= {}, "$enabledServers", enabledServers).map((s) => s.name),
            selectedMcpServers: store_get($$store_subs ??= {}, "$enabledServers", enabledServers).map((s) => ({ name: s.name, url: s.url, headers: s.headers }))
          },
          messageUpdatesAbortController.signal
        ).catch((err) => {
          error.set(err.message);
        });
        if (messageUpdatesIterator === void 0) return;
        files = [];
        let buffer = "";
        let lastUpdateTime = /* @__PURE__ */ new Date();
        for await (const update of messageUpdatesIterator) {
          if (store_get($$store_subs ??= {}, "$isAborted", isAborted)) {
            messageUpdatesAbortController.abort();
            return;
          }
          if (update.type === MessageUpdateType.Stream) {
            update.token = update.token.replaceAll("\0", "");
          }
          const isKeepAlive = update.type === MessageUpdateType.Status && update.status === MessageUpdateStatus.KeepAlive;
          if (!isKeepAlive) {
            if (update.type === MessageUpdateType.Stream) {
              const existingUpdates = messageToWriteTo.updates ?? [];
              const lastUpdate = existingUpdates.at(-1);
              if (lastUpdate?.type === MessageUpdateType.Stream) {
                const merged = {
                  ...lastUpdate,
                  token: (lastUpdate.token ?? "") + (update.token ?? "")
                };
                messageToWriteTo.updates = [...existingUpdates.slice(0, -1), merged];
              } else {
                messageToWriteTo.updates = [...existingUpdates, update];
              }
            } else {
              messageToWriteTo.updates = [...messageToWriteTo.updates ?? [], update];
            }
          }
          const currentTime = /* @__PURE__ */ new Date();
          if (update.type !== MessageUpdateType.Stream && !store_get($$store_subs ??= {}, "$settings", settings).disableStream && buffer.length > 0) {
            messageToWriteTo.content += buffer;
            buffer = "";
            lastUpdateTime = currentTime;
          }
          if (update.type === MessageUpdateType.Stream && !store_get($$store_subs ??= {}, "$settings", settings).disableStream) {
            buffer += update.token;
            if (currentTime.getTime() - lastUpdateTime.getTime() > updateDebouncer.maxUpdateTime) {
              messageToWriteTo.content += buffer;
              buffer = "";
              lastUpdateTime = currentTime;
            }
            pending = false;
          } else if (update.type === MessageUpdateType.FinalAnswer) {
            const hadTools = messageToWriteTo.updates?.some((u) => u.type === MessageUpdateType.Tool) ?? false;
            if (hadTools) {
              const existing = messageToWriteTo.content;
              const finalText = update.text ?? "";
              const trimmedExistingSuffix = existing.replace(/\s+$/, "");
              const trimmedFinalPrefix = finalText.replace(/^\s+/, "");
              const alreadyStreamed = finalText && (existing.endsWith(finalText) || trimmedFinalPrefix.length > 0 && trimmedExistingSuffix.endsWith(trimmedFinalPrefix));
              if (existing && existing.length > 0) {
                if (alreadyStreamed) {
                  messageToWriteTo.content = existing;
                } else if (finalText && (finalText.startsWith(existing) || trimmedExistingSuffix.length > 0 && trimmedFinalPrefix.startsWith(trimmedExistingSuffix))) {
                  messageToWriteTo.content = finalText;
                } else {
                  const needsGap = !/\n\n$/.test(existing) && !/^\n/.test(finalText ?? "");
                  messageToWriteTo.content = existing + (needsGap ? "\n\n" : "") + finalText;
                }
              } else {
                messageToWriteTo.content = finalText;
              }
            } else {
              messageToWriteTo.content = update.text ?? "";
            }
          } else if (update.type === MessageUpdateType.Status && update.status === MessageUpdateStatus.Error) {
            if (update.statusCode === 402) {
              showSubscribeModal = true;
            } else {
              store_set(error, update.message ?? "An error has occurred");
            }
          } else if (update.type === MessageUpdateType.Title) {
            const convInData = conversations.find(({ id }) => id === page.params.id);
            if (convInData) {
              convInData.title = update.title;
              store_set(titleUpdate, { title: update.title, convId: page.params.id });
            }
          } else if (update.type === MessageUpdateType.File) {
            messageToWriteTo.files = [
              ...messageToWriteTo.files ?? [],
              {
                type: "hash",
                value: update.sha,
                mime: update.mime,
                name: update.name
              }
            ];
          } else if (update.type === MessageUpdateType.RouterMetadata) {
            messageToWriteTo.routerMetadata = { route: update.route, model: update.model };
          }
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes("overloaded")) {
          store_set(error, "Too much traffic, please try again.");
        } else if (err instanceof Error && err.message.includes("429")) {
          store_set(error, ERROR_MESSAGES.rateLimited);
        } else if (err instanceof Error) {
          store_set(error, err.message);
        } else {
          store_set(error, ERROR_MESSAGES.default);
        }
        console.error(err);
      } finally {
        store_set(loading, false);
        pending = false;
        await invalidateAll();
      }
    }
    async function stopGeneration() {
      await fetch(`${base}/conversation/${page.params.id}/stop-generating`, { method: "POST" }).then((r) => {
        if (r.ok) {
          setTimeout(
            () => {
              store_set(isAborted, true);
              store_set(loading, false);
            },
            500
          );
        } else {
          store_set(isAborted, true);
          store_set(loading, false);
        }
      });
    }
    async function onMessage(content) {
      await writeMessage({ prompt: content });
    }
    async function onRetry(payload) {
      if (requireAuthUser()) return;
      const lastMsgId = payload.id;
      messagesPath = createMessagesPath(messages, lastMsgId);
      await writeMessage({
        prompt: payload.content,
        messageId: payload.id,
        isRetry: true
      });
    }
    async function onShowAlternateMsg(payload) {
      const msgId = payload.id;
      messagesPath = createMessagesPath(messages, msgId);
    }
    const settings = useSettingsStore();
    let messages = data.messages;
    let messagesPath = createMessagesPath(messages);
    let messagesAlternatives = createMessagesAlternatives(messages);
    let title = (() => {
      const rawTitle = conversations.find((conv) => conv.id === page.params.id)?.title ?? data.title;
      return rawTitle ? rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1) : rawTitle;
    })();
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("1djqiyk", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>${escape_html(title)}</title>`);
        });
      });
      ChatWindow($$renderer3, {
        loading: store_get($$store_subs ??= {}, "$loading", loading),
        pending,
        messages: messagesPath,
        messagesAlternatives,
        shared: data.shared,
        preprompt: data.preprompt,
        onmessage: onMessage,
        onretry: onRetry,
        onshowAlternateMsg: onShowAlternateMsg,
        onstop: stopGeneration,
        models: data.models,
        currentModel: findCurrentModel(data.models, data.oldModels, data.model),
        get files() {
          return files;
        },
        set files($$value) {
          files = $$value;
          $$settled = false;
        }
      });
      $$renderer3.push(`<!----> `);
      if (showSubscribeModal) {
        $$renderer3.push("<!--[-->");
        SubscribeModal($$renderer3, { close: () => showSubscribeModal = false });
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]-->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, { data });
  });
}
export {
  _page as default
};
