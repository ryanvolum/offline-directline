import * as request from 'request';
import * as http from 'http';
import * as HttpStatus from "http-status-codes";
import * as uuidv4 from 'uuid/v4';

import { IUser } from './types/userTypes';
import { IActivity, IConversationUpdateActivity, IMessageActivity, IContactRelationUpdateActivity, ITypingActivity, IInvokeActivity } from './types/activityTypes';
import { IAttachment, ICardAction } from './types/attachmentTypes';
import { IConversationAccount, IChannelAccount } from './types/accountTypes';
import { IEntity } from './types/entityTypes';
import { IConversation } from './types/conversationTypes';
import { IBot, IBotData } from './types/botTypes';
import { v30AuthenticationSettings } from './settings';

/**
 * Stores and propagates conversation messages.
 */
export class Conversation {
    private accessToken: string;
    private accessTokenExpires: number;

    // TODO receive IBot as parameter
    constructor(conversationId: string, user: IUser, bot: IBot) {
        this.conversationId = conversationId;
        this.bot = bot;
        this.user = user;
        this.members.push({ id: bot.botId, name: "Bot" });
        this.members.push({ id: user.id, name: user.name });
    }

    //the bot this conversation is with
    public bot: IBot;

    //the user this conversation is with
    public user: IUser

    // the id for this conversation
    public conversationId: string;

    // the list of activities in this conversation
    public activities: IActivity[] = [];

    public members: IUser[] = [];

    private postage(recipientId: string, activity: IActivity) {
        activity.id = activity.id || uuidv4();
        activity.channelId = 'emulator';
        activity.recipient = { id: recipientId };
        activity.conversation = activity.conversation || { id: this.conversationId };
    }

    postActivityToBot(activity: IActivity, recordInConversation: boolean, cb?) {

        this.postage(this.bot.botId, activity);
        if (!activity.recipient.name) {
            activity.recipient.name = this.bot.botId;
        }

        if (this.bot) {

            let responseCallback = (err, resp: http.IncomingMessage, body) => {
                let messageActivity: IMessageActivity = activity;
                let text = messageActivity.text || '';
                if (text && text.length > 50)
                    text = text.substring(0, 50);

                if (err) {
                    console.error("Post message error->", err.message, activity);
                }
                else if (resp) {
                    if (!/^2\d\d$/.test(`${resp.statusCode}`)) {
                        //log error to console
                        console.error("Post message status error->", err.message, activity, resp.statusCode,
                            body, resp.statusMessage, activity.type, "TEXT->" + text);

                        if (Number(resp.statusCode) == 401 || Number(resp.statusCode) == 402) {
                            console.error("Error: The bot's MSA appId or password is incorrect.");
                        }
                        cb(err, resp ? resp.statusCode : undefined);
                    } else {
                        console.info("Post message info->", activity, resp.statusCode,
                            body, resp.statusMessage, activity.type, "TEXT->" + text);

                        if (recordInConversation) {
                            this.activities.push(Object.assign({}, activity));
                        }
                        if (activity.type === 'invoke') {
                            cb(null, resp.statusCode, activity.id, body);
                        } else {
                            cb(null, resp.statusCode, activity.id);
                        }
                    }
                }
            }

            let options: request.OptionsWithUrl = {
                url: this.bot.botUrl,
                method: "POST",
                json: activity,
                //agent: proxyAgent,         
                strictSSL: false
            };

            if (this.bot.msaAppId && this.bot.msaPassword) {
                this.authenticatedRequest(options, responseCallback);
            } else {
                request(options, responseCallback);
            }
        } else {
            cb("bot not found");
        }

    }

    private authenticatedRequest(authOptions: request.OptionsWithUrl, callback: (error: any, response: http.IncomingMessage, body: any) => void, refresh = false): void {
        if (refresh) {
            this.accessToken = null;
        }
        this.addAccessToken(authOptions, (err) => {
            if (!err) {
                request(authOptions, (err, response, body) => {
                    if (!err) {
                        switch (response.statusCode) {
                            case HttpStatus.UNAUTHORIZED:
                            case HttpStatus.FORBIDDEN:
                                if (!refresh) {
                                    this.authenticatedRequest(authOptions, callback, true);
                                } else {
                                    callback(null, response, body);
                                }
                                break;
                            default:
                                if (response.statusCode < 400) {
                                    callback(null, response, body);
                                } else {
                                    let txt = "Request to '" + authOptions.url + "' failed: [" + response.statusCode + "] " + response.statusMessage;
                                    callback(new Error(txt), response, null);
                                }
                                break;
                        }
                    } else {
                        callback(err, null, null);
                    }
                });
            } else {
                callback(err, null, null);
            }
        });
    }

    private addAccessToken(accessOptions: request.Options, cb: (err: Error) => void): void {
        if (this.bot.msaAppId && this.bot.msaPassword) {
            this.getAccessToken((err, token) => {
                if (!err && token) {
                    accessOptions.headers = {
                        'Authorization': 'Bearer ' + token
                    };
                    cb(null);
                } else {
                    cb(err);
                }
            });
        } else {
            cb(null);
        }
    }

    public getAccessToken(cb: (err: Error, accessToken: string) => void): void {
        if (!this.accessToken || new Date().getTime() >= this.accessTokenExpires) {
            // Refresh access token
            let opt: request.OptionsWithUrl = {
                method: 'POST',
                url: v30AuthenticationSettings.tokenEndpoint,
                form: {
                    grant_type: 'client_credentials',
                    client_id: this.bot.msaAppId,
                    client_secret: this.bot.msaPassword,
                    scope: v30AuthenticationSettings.tokenScope
                },
                //agent: proxyAgent,
                strictSSL: false
            };

            request(opt, (err, response, body) => {
                if (!err) {
                    if (body && response.statusCode < 300) {
                        // Subtract 5 minutes from expires_in so they'll we'll get a
                        // new token before it expires.
                        let oauthResponse = JSON.parse(body);
                        this.accessToken = oauthResponse.access_token;
                        this.accessTokenExpires = new Date().getTime() + ((oauthResponse.expires_in - 300) * 1000);
                        cb(null, this.accessToken);
                    } else {
                        cb(new Error('Refresh access token failed with status code: ' + response.statusCode + ". Error:" + response.error), null);
                    }
                } else {
                    cb(err, null);
                }
            });
        } else {
            cb(null, this.accessToken);
        }
    }

    // add member
    public addMember(id: string, name: string): IUser {
        let uniqueId = uuidv4();
        name = name || `user-${uniqueId}`;
        id = id || uniqueId;
        let user = { name, id };
        this.members.push(user);
        this.sendConversationUpdate([user], undefined);
        return user;
    }

    sendConversationUpdate(membersAdded: IUser[], membersRemoved: IUser[]) {
        const activity: IConversationUpdateActivity = {
            type: 'conversationUpdate',
            membersAdded,
            membersRemoved
        }
        this.postActivityToBot(activity, false, () => { });
    }
}


/**
 * A set of conversations with a bot.
 */
export class ConversationSet {
    botId: string;
    conversations: Conversation[] = [];

    constructor(botId: string) {
        this.botId = botId;
    }

    newConversation(user: IUser, bot: IBot, conversationId?: string): Conversation {
        const conversation = new Conversation(conversationId || uuidv4(), user, bot);
        this.conversations.push(conversation);
        return conversation;
    }

    conversationById(conversationId: string): Conversation {
        return this.conversations.find(value => value.conversationId === conversationId);
    }
}


/**
 * Container for conversations.
 */
export class ConversationManager {
    conversationSets: ConversationSet[] = [];
    /**
     * Creates a new conversation.
     */
    public newConversation(bot: IBot, user: IUser, conversationId?: string): Conversation {
        let conversationSet = this.conversationSets.find(value => value.botId === bot.botId);
        if (!conversationSet) {
            conversationSet = new ConversationSet(bot.botId);
            this.conversationSets.push(conversationSet);
        }
        let conversation = conversationSet.newConversation(user, bot, conversationId);
        return conversation;
    }

    /**
     * Gets the existing conversation, or returns undefined.
     */
    public conversationById(botId: string, conversationId: string): Conversation {
        const set = this.conversationSets.find(set => set.botId === botId);
        if (set) {
            return set.conversationById(conversationId);
        }
    }
}
