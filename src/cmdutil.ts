const directline = require("../dist/bridge.js");
const express = require("express");

const app = express();

if (process.argv[2] && process.argv[3]) {
    const port = process.argv[2];
    const botEndpoint = process.argv[3];
    const botMsaAppId = process.argv[4];
    const botMsaPassword = process.argv[5];

    const bot = {
        "botId": "YOURBOTID",
        "botUrl": botEndpoint,
        "msaAppId": botMsaAppId,
        "msaPassword": botMsaPassword
    };

    app.set("port", port);
    directline.initializeRoutes(app, "http://127.0.0.1:" + port, bot);
} else {
    console.log("Invalid parameters. First parameter should be your host port. Second parameter should be your bot endpoint");
}