import { IBotData, IConversation } from "./types";
import { createClient, RedisClientType } from "redis";
require("dotenv").config();

export interface IStore {
  start(): Promise<void>;
  setBotData(key: string, botData: IBotData): Promise<any>;
  getBotData(key: string): Promise<IBotData>;
  deleteBotData(key: string): Promise<any>;
  getAllBotDataKeys(): Promise<string[]>;
  setConversation(key: string, conversation: IConversation): Promise<any>;
  getConversation(key: string): Promise<IConversation>;
  deleteConversation(key: string): Promise<any>;
  getAllConversationKeys(): Promise<string[]>;
}

export class MemoryStore implements IStore {
  conversations: { [key: string]: IConversation };
  botData: { [key: string]: IBotData };

  constructor() {
    this.conversations = {};
    this.botData = {};
  }
  async deleteConversation(key) {
    delete this.conversations[key];
  }
  async getAllConversationKeys() {
    return Object.keys(this.conversations);
  }
  async getAllBotDataKeys() {
    return Object.keys(this.botData);
  }
  async deleteBotData(key) {
    delete this.botData[key];
  }
  async start() {
    return;
  }
  async setBotData(key, botData) {
    this.botData[key] = botData;
  }
  async getBotData(key) {
    return this.botData[key] ?? { eTag: null, data: null };
  }
  async setConversation(key, conversation) {
    this.conversations[key] = conversation;
  }
  async getConversation(key) {
    return (
      this.conversations[key] ?? {
        conversationId: null,
        webSocketServer: null,
        history: null,
      }
    );
  }
}

export class RedisStore implements IStore {
  client: RedisClientType<any, any>;

  constructor({ host, port }) {
    this.client = createClient({ socket: { host, port } });
  }
  async deleteConversation(key) {
    return this.client.hDel("conversation", key);
  }
  async getAllConversationKeys() {
    return this.client.hKeys("conversation");
  }
  async getAllBotDataKeys() {
    return this.client.hKeys("botData");
  }
  async deleteBotData(key) {
    return this.client.hDel("botData", key);
  }
  async start() {
    return this.client
      .connect()
      .then(() => {
        console.log("Connection with Redis server established.");
      })
      .catch((reason) => {
        console.log("Could not connect to Redis server. Reason: ", reason);
        throw new Error(reason);
      });
  }
  async setBotData(key, botData) {
    return this.client.hSet("botData", key, JSON.stringify(botData));
  }
  async getBotData(key) {
    return JSON.parse(await this.client.hGet("botData", key));
  }
  async setConversation(key, conversation) {
    return this.client.hSet("conversation", key, JSON.stringify(conversation));
  }
  async getConversation(key) {
    return JSON.parse(await this.client.hGet("conversation", key));
  }
}

export function getStore() {
  let store: IStore;
  switch (process.env.STORE_TYPE ?? "memory") {
    case "redis":
      store = new RedisStore({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
      });
      break;
    case "memory":
    default:
      store = new MemoryStore();
      break;
  }
  return store;
}
