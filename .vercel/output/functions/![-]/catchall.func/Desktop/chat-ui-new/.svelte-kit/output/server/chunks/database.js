import { MongoClient, GridFSBucket } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { l as logger } from "./logger.js";
import { b as building } from "./environment.js";
import { o as onExit } from "./exitHandler.js";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import { existsSync, mkdirSync } from "fs";
import { c as config } from "./config.js";
function findRepoRoot(startPath) {
  let currentPath = startPath;
  while (currentPath !== "/") {
    if (existsSync(join(currentPath, "package.json"))) {
      return currentPath;
    }
    currentPath = dirname(currentPath);
  }
  throw new Error("Could not find repository root (no package.json found)");
}
const CONVERSATION_STATS_COLLECTION = "conversations.stats";
class Database {
  async init() {
    const DB_FOLDER = config.MONGO_STORAGE_PATH || join(findRepoRoot(dirname(fileURLToPath(import.meta.url))), "db");
    if (!config.MONGODB_URL) {
      logger.warn("No MongoDB URL found, using in-memory server");
      logger.info(`Using database path: ${DB_FOLDER}`);
      if (!existsSync(DB_FOLDER)) {
        logger.info(`Creating database directory at ${DB_FOLDER}`);
        mkdirSync(DB_FOLDER, { recursive: true });
      }
      this.mongoServer = await MongoMemoryServer.create({
        instance: {
          dbName: config.MONGODB_DB_NAME + "",
          dbPath: DB_FOLDER
        },
        binary: {
          version: "7.0.18"
        }
      });
      this.client = new MongoClient(this.mongoServer.getUri(), {
        directConnection: config.MONGODB_DIRECT_CONNECTION === "true"
      });
    } else {
      this.client = new MongoClient(config.MONGODB_URL, {
        directConnection: config.MONGODB_DIRECT_CONNECTION === "true"
      });
    }
    try {
      logger.info("Connecting to database");
      await this.client.connect();
      logger.info("Connected to database");
      this.client.db(config.MONGODB_DB_NAME + (false ? "-test" : ""));
      await this.initDatabase();
    } catch (err) {
      logger.error(err, "Connection error");
      process.exit(1);
    }
    onExit(async () => {
      logger.info("Closing database connection");
      await this.client?.close(true);
      await this.mongoServer?.stop();
    });
  }
  static async getInstance() {
    if (!Database.instance) {
      Database.instance = new Database();
      await Database.instance.init();
    }
    return Database.instance;
  }
  /**
   * Return mongoClient
   */
  getClient() {
    if (!this.client) {
      throw new Error("Database not initialized");
    }
    return this.client;
  }
  /**
   * Return map of database's collections
   */
  getCollections() {
    if (!this.client) {
      throw new Error("Database not initialized");
    }
    const db = this.client.db(
      config.MONGODB_DB_NAME + ""
    );
    const conversations = db.collection("conversations");
    const conversationStats = db.collection(CONVERSATION_STATS_COLLECTION);
    const assistants = db.collection("assistants");
    const assistantStats = db.collection("assistants.stats");
    const reports = db.collection("reports");
    const sharedConversations = db.collection("sharedConversations");
    const abortedGenerations = db.collection("abortedGenerations");
    const settings = db.collection("settings");
    const users = db.collection("users");
    const sessions = db.collection("sessions");
    const messageEvents = db.collection("messageEvents");
    const bucket = new GridFSBucket(db, { bucketName: "files" });
    const migrationResults = db.collection("migrationResults");
    const semaphores = db.collection("semaphores");
    const tokenCaches = db.collection("tokens");
    const tools = db.collection("tools");
    const configCollection = db.collection("config");
    const generatedImages = db.collection("generatedImages");
    const generatedVideos = db.collection("generatedVideos");
    return {
      conversations,
      conversationStats,
      assistants,
      assistantStats,
      reports,
      sharedConversations,
      abortedGenerations,
      settings,
      users,
      sessions,
      messageEvents,
      bucket,
      migrationResults,
      semaphores,
      tokenCaches,
      tools,
      config: configCollection,
      generatedImages,
      generatedVideos
    };
  }
  /**
   * Init database once connected: Index creation
   * @private
   */
  initDatabase() {
    const {
      conversations,
      conversationStats,
      assistants,
      assistantStats,
      reports,
      sharedConversations,
      abortedGenerations,
      settings,
      users,
      sessions,
      messageEvents,
      semaphores,
      tokenCaches,
      config: config2,
      generatedImages,
      generatedVideos
    } = this.getCollections();
    conversations.createIndex(
      { sessionId: 1, updatedAt: -1 },
      { partialFilterExpression: { sessionId: { $exists: true } } }
    ).catch((e) => logger.error(e));
    conversations.createIndex(
      { userId: 1, updatedAt: -1 },
      { partialFilterExpression: { userId: { $exists: true } } }
    ).catch((e) => logger.error(e));
    conversations.createIndex(
      { "message.id": 1, "message.ancestors": 1 },
      { partialFilterExpression: { userId: { $exists: true } } }
    ).catch((e) => logger.error(e));
    conversations.createIndex({ "messages.createdAt": 1 }, { sparse: true }).catch((e) => logger.error(e));
    conversationStats.createIndex(
      {
        type: 1,
        "date.field": 1,
        "date.span": 1,
        "date.at": 1,
        distinct: 1
      },
      { unique: true }
    ).catch((e) => logger.error(e));
    conversationStats.createIndex({
      type: 1,
      "date.field": 1,
      "date.at": 1
    }).catch((e) => logger.error(e));
    abortedGenerations.createIndex({ updatedAt: 1 }, { expireAfterSeconds: 30 }).catch((e) => logger.error(e));
    abortedGenerations.createIndex({ conversationId: 1 }, { unique: true }).catch((e) => logger.error(e));
    sharedConversations.createIndex({ hash: 1 }, { unique: true }).catch((e) => logger.error(e));
    settings.createIndex({ sessionId: 1 }, { unique: true, sparse: true }).catch((e) => logger.error(e));
    settings.createIndex({ userId: 1 }, { unique: true, sparse: true }).catch((e) => logger.error(e));
    settings.createIndex({ assistants: 1 }).catch((e) => logger.error(e));
    users.createIndex({ hfUserId: 1 }, { unique: true }).catch((e) => logger.error(e));
    users.createIndex({ sessionId: 1 }, { unique: true, sparse: true }).catch((e) => logger.error(e));
    users.createIndex({ username: 1 }).catch((e) => logger.error(e));
    messageEvents.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 1 }).catch((e) => logger.error(e));
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch((e) => logger.error(e));
    sessions.createIndex({ sessionId: 1 }, { unique: true }).catch((e) => logger.error(e));
    assistants.createIndex({ createdById: 1, userCount: -1 }).catch((e) => logger.error(e));
    assistants.createIndex({ userCount: 1 }).catch((e) => logger.error(e));
    assistants.createIndex({ review: 1, userCount: -1 }).catch((e) => logger.error(e));
    assistants.createIndex({ modelId: 1, userCount: -1 }).catch((e) => logger.error(e));
    assistants.createIndex({ searchTokens: 1 }).catch((e) => logger.error(e));
    assistants.createIndex({ last24HoursCount: 1 }).catch((e) => logger.error(e));
    assistants.createIndex({ last24HoursUseCount: -1, useCount: -1, _id: 1 }).catch((e) => logger.error(e));
    assistantStats.createIndex({ "date.span": 1, "date.at": 1, assistantId: 1 }, { unique: true }).catch((e) => logger.error(e));
    reports.createIndex({ assistantId: 1 }).catch((e) => logger.error(e));
    reports.createIndex({ createdBy: 1, assistantId: 1 }).catch((e) => logger.error(e));
    semaphores.createIndex({ key: 1 }, { unique: true }).catch((e) => logger.error(e));
    semaphores.createIndex({ deleteAt: 1 }, { expireAfterSeconds: 1 }).catch((e) => logger.error(e));
    tokenCaches.createIndex({ createdAt: 1 }, { expireAfterSeconds: 5 * 60 }).catch((e) => logger.error(e));
    tokenCaches.createIndex({ tokenHash: 1 }).catch((e) => logger.error(e));
    conversations.createIndex({
      "messages.from": 1,
      createdAt: 1
    }).catch((e) => logger.error(e));
    conversations.createIndex({
      userId: 1,
      sessionId: 1
    }).catch((e) => logger.error(e));
    config2.createIndex({ key: 1 }, { unique: true }).catch((e) => logger.error(e));
    generatedImages.createIndex({ userId: 1, createdAt: -1 }).catch((e) => logger.error(e));
    generatedVideos.createIndex({ userId: 1, createdAt: -1 }).catch((e) => logger.error(e));
  }
}
let collections;
const ready = (async () => {
  if (!building) {
    const db = await Database.getInstance();
    collections = db.getCollections();
  } else {
    collections = {};
  }
})();
async function getCollectionsEarly() {
  await ready;
  if (!collections) {
    throw new Error("Database not initialized");
  }
  return collections;
}
export {
  CONVERSATION_STATS_COLLECTION,
  Database,
  collections,
  getCollectionsEarly,
  ready
};
