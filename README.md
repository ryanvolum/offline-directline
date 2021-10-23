offline-directline
(https://www.npmjs.com/package/offline-directline)
================
Unofficial package to emulate the bot framework connector locally. This package exposes three endpoints: 
1. directline - For your messaging client to post and get message activities to
2. conversation - For your bot to post message activities to
3. botstate - For your bot to post and get state to (privateConversationData, conversationData and userData)

See [Bot Framework API Reference](https://docs.microsoft.com/en-us/bot-framework/rest-api/bot-framework-rest-connector-api-reference) for API references. 

NOTE: Not all routes (e.g. attachments) are fully implemented in this package. For now this connector functions as a message broker and state store. Further, this package currently facilitates a single conversation between a user and a bot.

## To launch the project locally

```sh
npm run build
npm start
```

## Installation

### NPM

```sh
npm install offline-directline
```

## Usage

Using this package requires multiple moving pieces. For one you need to have a bot web service (hosted locally or elsewhere). Further, you'll need to install and include this package in a node project and run it. Finally you'll need a client (we'll use webchat) to connect to our offline directline instance. 

### Set up your direct line connector from the command line

```sh
npm install offline-directline -g
```
Then simply use the "directline" command with the endpoint where you want to host offline-directline and the endpoint where your bot is hosted

```sh
directline -d 3000 -b "http://127.0.0.1:3978/api/messages"
```

For details on how to set up your bot/client, see further instructions below.

### Set up your direct line connector in code
In order to run an instance of offline directline, you'll need to create a new project, include this module, and run initializeRoutes:

1. Create a new node project 
    * npm init 
    * create a javascript file (e.g. app.js, index.js)
2. Include express and the offline-directline packages
3. Create an express server
4. Call the initializeRoutes function, passing in:
    * Your express server
    * The port where you want to host the offline connector
    * Your bot messaging endpoint (generally ends in api/messages)
4. Run your code (node app.js in the command line)!

```js
const directline = require("offline-directline");
const express = require("express");

const app = express();
directline.initializeRoutes(app, 3000, "http://127.0.0.1:3978/api/messages");
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

## PPIBot 
![conversation_creation](https://user-images.githubusercontent.com/62081471/138552358-5e02b50e-252a-44e6-ab0d-e8ac4fba229f.png)


#### Stages

1. First, the user requests the web page. Once the web page is loaded, the frontend sends a request to the
offline-directline server in order to start a conversation with the bot. Offline-directline server will tell the bot that a new conversation has been created. The bot can now send a welcome message. Offline-directline will answer with a ConversationInformation object containing
the required data to start sending and receiving information to the new channel, such as the conversation ID
and the WebSocket server address where the messages will be received from.

2. The frontend establishes a connection with the WebSocket server and will start receiving new messages
from now on. But there is still a problem: there could be some unreceived messages that were sent before
the frontend started listening to WebSocket server, so this is why stage 3 is needed.

3. The frontend requests the previous messages (ActivityUpdates) from the conversation that could not be
received by the WebSocket connection. In this way, no messages remain unread by the user as, for example,
the bot sends a welcome message just after the connection is created.

* * *
![sendingandreceiving](https://user-images.githubusercontent.com/62081471/138552394-df46ceb1-5155-4e43-8901-2fba6e6aa32e.png)


#### Stages

1. The frontend wants to send a message to the bot. Therefore, it uses Direct Line API 3.0 and sends an activity to offline-directline.

2. Offline-directline receives the message from the frontend and forwards it to the bot using Bot Connector API.

3. The bot registers the incoming activity, assigns it an ID and returns the ID back to offline-directline.

4. Offline-directline sends the ID back to the frontend, so it knows the activity has been registered by the bot.

5. Eventually, the bot will compute an answer and it will send it using Bot Connector API.

6. Now the offline-directline server receives the answer and it saves it in the conversation history, waiting for the frontend to retrieve it using Direct Line API 3.0. Offline-directline will also broadcast the activity through the corresponding WebSocket server so everybody in the conversation can listen to it instantly.



