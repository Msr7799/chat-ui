import { collections, CONVERSATION_STATS_COLLECTION } from "./database.js";
import { l as logger } from "./logger.js";
import { a as acquireLock, b as refreshLock } from "./lock.js";
import { S as Semaphores } from "./config.js";
async function getLastComputationTime() {
  const lastStats = await collections.conversationStats.findOne({}, { sort: { "date.at": -1 } });
  return lastStats?.date?.at || /* @__PURE__ */ new Date(0);
}
async function shouldComputeStats() {
  const lastComputationTime = await getLastComputationTime();
  const oneDayAgo = new Date(Date.now() - 24 * 36e5);
  return lastComputationTime < oneDayAgo;
}
async function computeAllStats() {
  for (const span of ["day", "week", "month"]) {
    computeStats({ dateField: "updatedAt", type: "conversation", span }).catch(
      (e) => logger.error(e)
    );
    computeStats({ dateField: "createdAt", type: "conversation", span }).catch(
      (e) => logger.error(e)
    );
    computeStats({ dateField: "createdAt", type: "message", span }).catch((e) => logger.error(e));
  }
}
async function computeStats(params) {
  const indexes = await collections.semaphores.listIndexes().toArray();
  if (indexes.length <= 2) {
    logger.info("Indexes not created, skipping stats computation");
    return;
  }
  const lastComputed = await collections.conversationStats.findOne(
    { "date.field": params.dateField, "date.span": params.span, type: params.type },
    { sort: { "date.at": -1 } }
  );
  const minDate = lastComputed ? lastComputed.date.at : /* @__PURE__ */ new Date(0);
  logger.debug(
    { minDate, dateField: params.dateField, span: params.span, type: params.type },
    "Computing conversation stats"
  );
  const dateField = params.type === "message" ? "messages." + params.dateField : params.dateField;
  const pipeline = [
    {
      $match: {
        [dateField]: { $gte: minDate }
      }
    },
    {
      $project: {
        [dateField]: 1,
        sessionId: 1,
        userId: 1
      }
    },
    ...params.type === "message" ? [
      {
        $unwind: "$messages"
      },
      {
        $match: {
          [dateField]: { $gte: minDate }
        }
      }
    ] : [],
    {
      $sort: {
        [dateField]: 1
      }
    },
    {
      $facet: {
        userId: [
          {
            $match: {
              userId: { $exists: true }
            }
          },
          {
            $group: {
              _id: {
                at: { $dateTrunc: { date: `$${dateField}`, unit: params.span } },
                userId: "$userId"
              }
            }
          },
          {
            $group: {
              _id: "$_id.at",
              count: { $sum: 1 }
            }
          },
          {
            $project: {
              _id: 0,
              date: {
                at: "$_id",
                field: params.dateField,
                span: params.span
              },
              distinct: "userId",
              count: 1
            }
          }
        ],
        sessionId: [
          {
            $match: {
              sessionId: { $exists: true }
            }
          },
          {
            $group: {
              _id: {
                at: { $dateTrunc: { date: `$${dateField}`, unit: params.span } },
                sessionId: "$sessionId"
              }
            }
          },
          {
            $group: {
              _id: "$_id.at",
              count: { $sum: 1 }
            }
          },
          {
            $project: {
              _id: 0,
              date: {
                at: "$_id",
                field: params.dateField,
                span: params.span
              },
              distinct: "sessionId",
              count: 1
            }
          }
        ],
        userOrSessionId: [
          {
            $group: {
              _id: {
                at: { $dateTrunc: { date: `$${dateField}`, unit: params.span } },
                userOrSessionId: { $ifNull: ["$userId", "$sessionId"] }
              }
            }
          },
          {
            $group: {
              _id: "$_id.at",
              count: { $sum: 1 }
            }
          },
          {
            $project: {
              _id: 0,
              date: {
                at: "$_id",
                field: params.dateField,
                span: params.span
              },
              distinct: "userOrSessionId",
              count: 1
            }
          }
        ],
        _id: [
          {
            $group: {
              _id: { $dateTrunc: { date: `$${dateField}`, unit: params.span } },
              count: { $sum: 1 }
            }
          },
          {
            $project: {
              _id: 0,
              date: {
                at: "$_id",
                field: params.dateField,
                span: params.span
              },
              distinct: "_id",
              count: 1
            }
          }
        ]
      }
    },
    {
      $project: {
        stats: {
          $concatArrays: ["$userId", "$sessionId", "$userOrSessionId", "$_id"]
        }
      }
    },
    {
      $unwind: "$stats"
    },
    {
      $replaceRoot: {
        newRoot: "$stats"
      }
    },
    {
      $set: {
        type: params.type
      }
    },
    {
      $merge: {
        into: CONVERSATION_STATS_COLLECTION,
        on: ["date.at", "type", "date.span", "date.field", "distinct"],
        whenMatched: "replace",
        whenNotMatched: "insert"
      }
    }
  ];
  await collections.conversations.aggregate(pipeline, { allowDiskUse: true }).next();
  logger.debug(
    { minDate, dateField: params.dateField, span: params.span, type: params.type },
    "Computed conversation stats"
  );
}
let hasLock = false;
let lockId = null;
async function maintainLock() {
  if (hasLock && lockId) {
    hasLock = await refreshLock(Semaphores.CONVERSATION_STATS, lockId);
    if (!hasLock) {
      lockId = null;
    }
  } else if (!hasLock) {
    lockId = await acquireLock(Semaphores.CONVERSATION_STATS) || null;
    hasLock = !!lockId;
  }
  setTimeout(maintainLock, 1e4);
}
function refreshConversationStats() {
  const ONE_HOUR_MS = 36e5;
  maintainLock().then(async () => {
    if (await shouldComputeStats()) {
      computeAllStats();
    }
    setInterval(async () => {
      if (await shouldComputeStats()) {
        computeAllStats();
      }
    }, 24 * ONE_HOUR_MS);
  });
}
export {
  computeAllStats as c,
  refreshConversationStats as r
};
