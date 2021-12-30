import * as bodyParser from "body-parser";
import * as express from "express";
import * as fetch from "isomorphic-fetch";
import * as moment from "moment";
import * as uuidv4 from "uuid/v4";
import { Server as WebSocketServer } from "ws";
import { getStore, IStore } from "./store";

import {
  IActivity,
  IBotData,
  IConversationUpdateActivity,
  IMessageActivity,
} from "./types";

const expiresIn = 1800;
const conversationsCleanupInterval = 10000;
const store: IStore = getStore();
const webSocketServers = {};

// Creates websocket server
function getWebsocketServer(botUrl, serviceUrl, conversationId) {
  const wss = new WebSocketServer({ noServer: true });
  wss.on("connection", function connection(ws) {
    ws.on("message", async function incoming(message) {
      const incomingActivity = JSON.parse(message);
      // Make copy of activity. Add required fields
      const activity = createMessageActivity(
        incomingActivity,
        serviceUrl,
        conversationId
      );
      await sendClientActivity(
        activity,
        conversationId,
        botUrl,
        () => {},
        () => {}
      );
    });
  });
  return wss;
}

// Sends http post containing a client activity
async function sendClientActivity(
  activity,
  conversationId,
  botUrl,
  onSuccess,
  onFail
) {
  const conversation = await store.getConversation(conversationId);
  if (conversation) {
    conversation.history.push(activity);
    await store.setConversation(conversationId, conversation);
    fetch(botUrl, {
      method: "POST",
      body: JSON.stringify(activity),
      headers: {
        "Content-Type": "application/json",
      },
    }).then(onSuccess);
    webSocketServers[conversationId].clients.forEach(function each(client) {
      client.send(JSON.stringify(activity));
    });
  } else {
    // Conversation was never initialized
    onFail();
  }
}

// Sends bot activity to the client
async function sendBotActivity(
  activity: IActivity,
  conversationId,
  onSuccess,
  onFail
) {
  activity.id = uuidv4();
  activity.from = { id: "id", name: "Bot" };

  const conversation = await store.getConversation(conversationId);
  if (conversation) {
    conversation.history.push(activity);
    store.setConversation(conversationId, conversation);
    webSocketServers[conversationId].clients.forEach(function each(client) {
      client.send(JSON.stringify(activity));
    });
    onSuccess();
  } else {
    // Conversation was never initialized
    onFail();
  }
}

export const getRouter = (
  serviceUrl: string,
  botUrl: string
): express.Router => {
  const router = express.Router();

  router.use(bodyParser.json()); // for parsing application/json
  router.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
  router.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Methods",
      "GET, PUT, POST, DELETE, PATCH, OPTIONS"
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-ms-bot-agent"
    );
    next();
  });
  // CLIENT ENDPOINT
  router.options("/directline", (req, res) => {
    res.status(200).end();
  });

  // Creates a conversation
  router.post("/directline/conversations", async (req, res) => {
    const conversationId: string = uuidv4().toString();
    await store.setConversation(conversationId, {
      conversationId,
      history: [],
    });
    webSocketServers[conversationId] = getWebsocketServer(
      botUrl,
      serviceUrl,
      conversationId
    );
    console.log("Created conversation with conversationId: " + conversationId);

    const activity = createConversationUpdateActivity(
      serviceUrl,
      conversationId
    );
    fetch(botUrl, {
      method: "POST",
      body: JSON.stringify(activity),
      headers: {
        "Content-Type": "application/json",
      },
    }).then((response) => {
      res.status(response.status).send({
        conversationId,
        expiresIn,
        streamUrl: serviceUrl + "/directline/stream?id=" + conversationId,
      });
    });
  });

  // Reconnect API
  router.get("/v3/directline/conversations/:conversationId", (req, res) => {
    console.warn(
      "/v3/directline/conversations/:conversationId not implemented"
    );
  });

  // Gets activities from store (local history array for now)
  router.get(
    "/directline/conversations/:conversationId/activities",
    async (req, res) => {
      const watermark =
        req.query.watermark && req.query.watermark !== "null"
          ? Number(req.query.watermark)
          : 0;

      const conversation = await store.getConversation(
        req.params.conversationId
      );
      if (conversation) {
        // If the bot has pushed anything into the history array
        if (conversation.history.length > watermark) {
          const activities = conversation.history.slice(watermark);
          res.status(200).json({
            activities,
            watermark: watermark + activities.length,
          });
        } else {
          res.status(200).send({
            activities: [],
            watermark,
          });
        }
      } else {
        // Conversation was never initialized
        res.status(400).send();
      }
    }
  );

  // Sends message to bot. Assumes message activities
  router.post(
    "/directline/conversations/:conversationId/activities",
    async (req, res) => {
      const incomingActivity = req.body;
      // Make copy of activity. Add required fields
      const activity = createMessageActivity(
        incomingActivity,
        serviceUrl,
        req.params.conversationId
      );

      await sendClientActivity(
        activity,
        req.params.conversationId,
        botUrl,
        (response) => {
          res.status(response.status).json({ id: activity.id });
        },
        () => {
          res.status(400).send();
        }
      );
    }
  );

  router.post(
    "/v3/directline/conversations/:conversationId/upload",
    (req, res) => {
      console.warn(
        "/v3/directline/conversations/:conversationId/upload not implemented"
      );
    }
  );
  router.get(
    "/v3/directline/conversations/:conversationId/stream",
    (req, res) => {
      console.warn(
        "/v3/directline/conversations/:conversationId/stream not implemented"
      );
    }
  );

  // BOT CONVERSATION ENDPOINT

  router.post("/v3/conversations", (req, res) => {
    console.warn("/v3/conversations not implemented");
  });

  router.post(
    "/v3/conversations/:conversationId/activities",
    async (req, res) => {
      await sendBotActivity(
        req.body,
        req.params.conversationId,
        () => res.status(200).send(),
        () => res.status(400).send()
      );
    }
  );

  router.post(
    "/v3/conversations/:conversationId/activities/:activityId",
    async (req, res) => {
      await sendBotActivity(
        req.body,
        req.params.conversationId,
        () => res.status(200).send(),
        () => res.status(400).send()
      );
    }
  );

  router.get("/v3/conversations/:conversationId/members", (req, res) => {
    console.warn("/v3/conversations/:conversationId/members not implemented");
  });
  router.get(
    "/v3/conversations/:conversationId/activities/:activityId/members",
    (req, res) => {
      console.warn(
        "/v3/conversations/:conversationId/activities/:activityId/members"
      );
    }
  );

  // BOTSTATE ENDPOINT

  router.get("/v3/botstate/:channelId/users/:userId", async (req, res) => {
    console.log("Called GET user data");
    await getBotData(req, res);
  });

  router.get(
    "/v3/botstate/:channelId/conversations/:conversationId",
    async (req, res) => {
      console.log("Called GET conversation data");
      await getBotData(req, res);
    }
  );

  router.get(
    "/v3/botstate/:channelId/conversations/:conversationId/users/:userId",
    async (req, res) => {
      console.log("Called GET private conversation data");
      await getBotData(req, res);
    }
  );

  router.post("/v3/botstate/:channelId/users/:userId", async (req, res) => {
    console.log("Called POST setUserData");
    await setUserData(req, res);
  });

  router.post(
    "/v3/botstate/:channelId/conversations/:conversationId",
    async (req, res) => {
      console.log("Called POST setConversationData");
      await setConversationData(req, res);
    }
  );

  router.post(
    "/v3/botstate/:channelId/conversations/:conversationId/users/:userId",
    async (req, res) => {
      await setPrivateConversationData(req, res);
    }
  );

  router.delete("/v3/botstate/:channelId/users/:userId", async (req, res) => {
    console.log("Called DELETE deleteStateForUser");
    await deleteStateForUser(req, res);
  });

  return router;
};

/**
 * @param app The express app where your offline-directline endpoint will live
 * @param port The port where your offline-directline will be hosted
 * @param botUrl The url of the bot (e.g. http://127.0.0.1:3978/api/messages)
 * @param conversationInitRequired Requires that a conversation is initialized before it is accessed, returning a 400
 * when not the case. If set to false, a new conversation reference is created on the fly. This is true by default.
 */
export const initializeRoutes = async (
  app: express.Express,
  endpoint: string,
  port: number,
  botUrl: string
) => {
  try {
    await store.start();
  } catch (e) {
    return;
  }
  conversationsCleanup();

  const directLineEndpoint = endpoint + ":" + port;
  const router = getRouter(directLineEndpoint, botUrl);

  app.use(router);
  const server = app.listen(port, () => {
    console.log(`Listening for messages from client on ${directLineEndpoint}`);
    console.log(`Routing messages to bot on ${botUrl}`);
  });

  server.on("upgrade", async (request, socket, head) => {
    const url = new URL(request.url, directLineEndpoint);
    if (url.pathname === "/directline/stream") {
      const conversation = await store.getConversation(
        url.searchParams.get("id")
      );
      if (conversation) {
        webSocketServers[conversation.conversationId].handleUpgrade(
          request,
          socket,
          head,
          (ws) => {
            webSocketServers[conversation.conversationId].emit(
              "connection",
              ws,
              request
            );
          }
        );
      }
    } else {
      socket.destroy();
    }
  });
};

const getBotDataKey = (
  channelId: string,
  conversationId: string,
  userId: string
) => {
  return `$${channelId || "*"}!${conversationId || "*"}!${userId || "*"}`;
};

const setBotData = async (
  channelId: string,
  conversationId: string,
  userId: string,
  incomingData: IBotData
): Promise<IBotData> => {
  const key = getBotDataKey(channelId, conversationId, userId);
  const newData: IBotData = {
    eTag: new Date().getTime().toString(),
    data: incomingData.data,
  };

  if (incomingData) {
    await store.setBotData(key, newData);
  } else {
    await store.deleteBotData(key);
    newData.eTag = "*";
  }

  return newData;
};

const getBotData = async (req: express.Request, res: express.Response) => {
  const key = getBotDataKey(
    req.params.channelId,
    req.params.conversationId,
    req.params.userId
  );
  console.log("Data key: " + key);

  res
    .status(200)
    .send((await store.getBotData(key)) || { data: null, eTag: "*" });
};

const setUserData = async (req: express.Request, res: express.Response) => {
  res
    .status(200)
    .send(
      await setBotData(
        req.params.channelId,
        req.params.conversationId,
        req.params.userId,
        req.body
      )
    );
};

const setConversationData = async (
  req: express.Request,
  res: express.Response
) => {
  res
    .status(200)
    .send(
      await setBotData(
        req.params.channelId,
        req.params.conversationId,
        req.params.userId,
        req.body
      )
    );
};

const setPrivateConversationData = async (
  req: express.Request,
  res: express.Response
) => {
  res
    .status(200)
    .send(
      await setBotData(
        req.params.channelId,
        req.params.conversationId,
        req.params.userId,
        req.body
      )
    );
};

const deleteStateForUser = async (
  req: express.Request,
  res: express.Response
) => {
  (await store.getAllBotDataKeys()).forEach(async (key) => {
    if (key.endsWith(`!{req.query.userId}`)) {
      await store.deleteBotData(key);
    }
  });
  res.status(200).send();
};

// CLIENT ENDPOINT HELPERS
const createMessageActivity = (
  incomingActivity: IMessageActivity,
  serviceUrl: string,
  conversationId: string
): IMessageActivity => {
  return {
    ...incomingActivity,
    channelId: "emulator",
    serviceUrl,
    conversation: { id: conversationId },
    id: uuidv4(),
  };
};

const createConversationUpdateActivity = (
  serviceUrl: string,
  conversationId: string
): IConversationUpdateActivity => {
  const activity: IConversationUpdateActivity = {
    type: "conversationUpdate",
    channelId: "emulator",
    serviceUrl,
    conversation: { id: conversationId },
    id: uuidv4(),
    membersAdded: [
      {
        id: "id",
        name: "Bot",
      },
      {
        id: uuidv4().toString(),
        name: "User",
      },
    ],
    recipient: {
      id: "id",
      name: "Bot",
    },
    membersRemoved: [],
    from: { id: "offline-directline", name: "Offline Directline Server" },
  };
  return activity;
};

const conversationsCleanup = () => {
  setInterval(async () => {
    const expiresTime = moment().subtract(expiresIn, "seconds");
    (await store.getAllConversationKeys()).forEach(async (conversationId) => {
      const conversation = await store.getConversation(conversationId);
      if (conversation.history.length > 0) {
        const lastTime = moment(
          conversation.history[conversation.history.length - 1].localTimestamp
        );
        if (lastTime < expiresTime) {
          await store.deleteConversation(conversationId);
          console.log("deleted cId: " + conversationId);
        }
      }
    });
  }, conversationsCleanupInterval);
};
