const url = require("url");
const directline = require("offline-directline");
const express = require("express");
const app = express();

const bot = {
    "botId": "Bot",
    "botUrl": "http://Your_Bots_Hostname/api/messages",
    "msaAppId": "", 
    "msaPassword": ""   
};
const port = process.env.PORT;
const serviceUrl = "http://Your_Service_Hostname:" + port;

app.set("port", port);
app.get('/', function (req, res) {
    res.send('Offline Directline Bot Connector');
});
directline.initializeRoutes(app, serviceUrl, bot);



