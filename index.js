"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const bodyParser = require("body-parser");
require("isomorphic-fetch");
const uuidv4 = require("uuid/v4");
const util = require("util");
const dotenv = require("dotenv");
const env = dotenv.config();
const app = express();
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, PATCH, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    next();
});
const expires_in = 1800;
let conversationId;
let history;
// Client Routes 
app.options('/directline', (req, res) => {
    res.status(200).end();
});
app.post('/directline/conversations', (req, res) => {
    history = [];
    createConversation(req, res);
});
app.get('/v3/directline/conversations/:conversationId', (req, res) => { });
app.get('/directline/conversations/:conversationId/activities', (req, res) => {
    getActivities(req, res);
});
app.post('/directline/conversations/:conversationId/activities', (req, res) => {
    postActivity(res, req.body.text);
});
app.post('/v3/directline/conversations/:conversationId/upload', (req, res) => { });
app.get('/v3/directline/conversations/:conversationId/stream', (req, res) => { });
// Botstate routes
app.get('/v3/botstate/:channelId/users/:userId', (req, res) => {
    console.log("Called GET user data");
    getBotData(req, res);
});
app.get('/v3/botstate/:channelId/conversations/:conversationId', (req, res) => {
    console.log(("Called GET conversation data"));
    getBotData(req, res);
});
app.get('/v3/botstate/:channelId/conversations/:conversationId/users/:userId', (req, res) => {
    console.log("Called GET private conversation data");
    getBotData(req, res);
});
app.post('/v3/botstate/:channelId/users/:userId', (req, res) => {
    console.log("Called POST setUserData");
    setUserData(req, res);
});
app.post('/v3/botstate/:channelId/conversations/:conversationId', (req, res) => {
    console.log("Called POST setConversationData");
    setConversationData(req, res);
});
app.post('/v3/botstate/:channelId/conversations/:conversationId/users/:userId', (req, res) => {
    setPrivateConversationData(req, res);
});
app.delete('/v3/botstate/:channelId/users/:userId', (req, res) => {
    console.log("Called DELETE deleteStateForUser");
    deleteStateForUser(req, res);
});
// BOT ROUTES
//createConversation
app.post('/v3/conversations', (req, res) => { });
//sendToConversation
app.post('/v3/conversations/:conversationId/activities', (req, res) => { });
app.post('/v3/conversations/:conversationId/activities/:activityId', (req, res) => {
    history.push(req.body);
    res.status(200).send();
    //replyToActivity
});
app.get('/v3/conversations/:conversationId/members', (req, res) => { });
app.get('/v3/conversations/:conversationId/activities/:activityId/members', (req, res) => { });
app.listen(3000, () => {
    console.log('listening');
});
//proactive messages?
const startConversation = (req, res) => {
};
const createConversation = (req, res) => {
    conversationId = uuidv4();
    console.log(conversationId);
    res.send({
        conversationId,
        expires_in
    });
};
//Sends message to bot
const postActivity = (res, text) => {
    let activity = createMessageActivity(text);
    fetch(env.parsed['BOT_HOST'], {
        method: "POST",
        body: JSON.stringify(activity),
        headers: {
            "Content-Type": "application/json"
        }
    });
};
const createMessageActivity = (text) => {
    let activity = {};
    activity.type = "message";
    activity.text = text;
    activity.from = { 'id': '12345', 'name': 'User' };
    activity.timestamp = (new Date).toISOString();
    activity.localTimestamp = (new Date).toISOString();
    activity.id = uuidv4();
    activity.channelId = "emulator";
    activity.conversation = { 'id': conversationId };
    activity.serviceUrl = env.parsed['SERVICE_URL'];
    return activity;
};
//Gets activities from store (local history array for now)
const getActivities = (req, res) => {
    let watermark = Number(req.query.watermark || 0) || 0;
    //If the bot has pushed anything into the history array
    if (history.length > watermark) {
        let activities = getActivitiesSince(watermark);
        //Activity housekeeping
        activities.forEach(activity => {
            //Creating random activity GUID right now (or webchat ignores the activity). Not persisting anywhere. Is there a need to?
            activity.id = uuidv4();
            activity.from = { id: "id", name: "name" };
        });
        res.status(200).json({
            activities: activities,
            watermark: watermark + activities.length
        });
    }
    else {
        res.status(200).send({
            activities: [],
            watermark: watermark
        });
    }
};
const getActivitiesSince = (watermark) => {
    return history.slice(watermark);
};
// Bot State API
let botDataStore = {};
const getBotDataKey = (channelId, conversationId, userId) => {
    return `$${channelId || '*'}!${conversationId || '*'}!${userId || '*'}`;
};
const setBotData = (channelId, conversationId, userId, incomingData) => {
    const key = getBotDataKey(channelId, conversationId, userId);
    let newData = {
        eTag: new Date().getTime().toString(),
        data: incomingData.data
    };
    if (!incomingData.data) {
        delete botDataStore[key];
        newData.eTag = '*';
    }
    else {
        botDataStore[key] = newData;
    }
    console.log("Data store: " + util.inspect(botDataStore, false, null));
    return newData;
};
const getBotData = (req, res) => {
    const key = getBotDataKey(req.params.channelId, req.params.conversationId, req.params.userId);
    console.log("Data key: " + key);
    res.status(200).send(botDataStore[key] || { data: null, eTag: '*' });
};
const setUserData = (req, res) => {
    res.status(200).send(setBotData(req.params.channelId, req.params.conversationId, req.params.userId, req.body));
};
const setConversationData = (req, res) => {
    res.status(200).send(setBotData(req.params.channelId, req.params.conversationId, req.params.userId, req.body));
};
const setPrivateConversationData = (req, res) => {
    res.status(200).send(setBotData(req.params.channelId, req.params.conversationId, req.params.userId, req.body));
};
const deleteStateForUser = (req, res) => {
    let keys = Object.keys(botDataStore);
    for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        if (key.endsWith(`!{req.query.userId}`)) {
            delete botDataStore[key];
        }
    }
    res.status(200);
};
