const directline = require("offline-directline");
const express = require("express");

const app = express();
directline.initializeRoutes(app, "http://127.0.0.1:3000", "http://127.0.0.1:3978/api/messages");

