offline-directline
(https://www.npmjs.com/package/offline-directline)
================
Unofficial package to emulate the bot framework connector locally. This package exposes three endpoints: 
1. directline - For your messaging client to post and get message activities to
2. conversation - For your bot to post message activities to
3. botstate - For your bot to post and get state to (privateConversationData, conversationData and userData)

See [Bot Framework API Reference](https://docs.microsoft.com/en-us/bot-framework/rest-api/bot-framework-rest-connector-api-reference) for API references. 

NOTE: Not all routes (e.g. attachments) are fully implemented in this package. For now this connector functions as a message broker and state store. Further, this package currently facilitates a single conversation between a user and a bot.


## Installation

### NPM

```sh
npm install --save offline-directline
```

## Usage
Using this package requires multiple moving pieces. For one you need to have a bot web service (hosted locally or elsewhere). Further, you'll need to install and include this package in a node project and run it. Finally you'll need a client (we'll use webchat) to connect to our offline directline instance. 

### Set up your direct line connector

There are two ways you can set up the connector. The easiest way is to npm install the package, and call the directline npm script from the command line with the first argument representing the port you want to host your connector on and the second representing the endpoint where your bot lives:

```sh
npm run directline 3000 localhost://127.0.0.1:3978/api/messages
```

Alternatively, you can start the connector from code, giving you full access to the server:

1. Include express and the offline-directline packages
2. Create an express server
3. Call the initializeRoutes function, passing in:
    * Your express server
    * The endpoint/port where you want to host the offline connector
    * Your bot messaging endpoint (generally ends in api/messages)
4. Run your code!

```js
const directline = require("offline-directline");
const express = require("express");

const app = express();
directline.initializeRoutes(app, "http://127.0.0.1:3000", "http://127.0.0.1:3978/api/messages");
```

### Build a bot 
See dev.botframework.com for bot building reference. You don't have to actually register a bot - just use one of the botbuilder SDKs to build a bot web service, which you can deploy locally or into the cloud. 

Once you have a bot service built, the only thing you need is your bot messaging endpoint.

### Set up your client
Though you could create your own client to connect to the directline endpoint that this package creates, I'll demonstrate this connection using the Microsoft Bot Framework WebChat channel. See the [Webchat Github Repo](https://github.com/Microsoft/BotFramework-WebChat) samples to get your client set up. Again, keep in mind that you won't actually need to register a bot or channels. As the samples demonstrate, you will create a BotChat.App which you will pass a directline object into. Add the a field for webSocket and set it to false, as in:

```js
BotChat.App({
    directLine: {
        secret: params['s'],
        token: params['t'],
        domain: params['domain'],
        webSocket: false // defaults to true
    },
```
This package is not using websockets, so this is our way of telling webchat to use polling instead. 

Now that you have a bot running and directline endpoint running, run your webchat client, passing in your directline endpoint (including '/directline/') as in:

```
http://localhost:8000/samples/fullwindow/?domain=http://localhost:3000/directline
```
Offline directline doesn't require a token or secret, so don't worry about these fields. 


Once everything is running, you should see messages sent in through webchat passed through to your bot and vice versa. Your bot should also be able to set privateConversationData, conversationData and userData as offered by the botbuilder SDKs.