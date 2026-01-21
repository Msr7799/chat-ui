import { collections } from "./database.js";
import { M as MetricsServer } from "./metrics.js";
import { error } from "@sveltejs/kit";
import { ObjectId } from "mongodb";
import { a as authCondition } from "./auth.js";
async function createConversationFromShare(fromShareId, locals, userAgent) {
  const conversation = await collections.sharedConversations.findOne({
    _id: fromShareId
  });
  if (!conversation) {
    error(404, "Conversation not found");
  }
  const existingConversation = await collections.conversations.findOne({
    "meta.fromShareId": fromShareId,
    ...authCondition(locals)
  });
  if (existingConversation) {
    return existingConversation._id.toString();
  }
  const res = await collections.conversations.insertOne({
    _id: new ObjectId(),
    title: conversation.title.replace(/<\/?think>/gi, "").trim(),
    rootMessageId: conversation.rootMessageId,
    messages: conversation.messages,
    model: conversation.model,
    preprompt: conversation.preprompt,
    createdAt: /* @__PURE__ */ new Date(),
    updatedAt: /* @__PURE__ */ new Date(),
    userAgent,
    ...locals.user ? { userId: locals.user._id } : { sessionId: locals.sessionId },
    meta: { fromShareId }
  });
  const newConvId = res.insertedId.toString();
  const sharedId = fromShareId;
  const files = await collections.bucket.find({ filename: { $regex: `^${sharedId}-` } }).toArray();
  await Promise.all(
    files.map(
      (file) => new Promise((resolve, reject) => {
        try {
          const newFilename = file.filename.replace(`${sharedId}-`, `${newConvId}-`);
          const downloadStream = collections.bucket.openDownloadStream(file._id);
          const uploadStream = collections.bucket.openUploadStream(newFilename, {
            metadata: { ...file.metadata, conversation: newConvId }
          });
          downloadStream.on("error", reject).pipe(uploadStream).on("error", reject).on("finish", () => resolve());
        } catch (e) {
          reject(e);
        }
      })
    )
  );
  if (MetricsServer.isEnabled()) {
    MetricsServer.getMetrics().model.conversationsTotal.inc({ model: conversation.model });
  }
  return res.insertedId.toString();
}
export {
  createConversationFromShare as c
};
