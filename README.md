## Offline-directline

This project works as a directline server to intercommunicate a chat frontend and a chatbot, delivering and storing messages from both sides. It can use Redis as a in-memory database.

## To launch the project locally

If you want to use Redis, first set the environment variable ```STORE_TYPE="redis"``` and configure your connection parameters. In case you are using a local database, you may use docker-compose to set up the Redis server. Just open a console and type ```docker-compose up``` in the root folder. Then:

```sh
npm run build
npm start
```

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



