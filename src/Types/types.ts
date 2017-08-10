// export interface IUser {
//     id: string,
//     name: string
// }

// export interface IChannelAccount {
//     id?: string,
//     name?: string,
// }

// export interface IConversationAccount extends IChannelAccount {
//     isGroup?: boolean,
// }

// export interface IAttachment {
//     contentType?: string,
//     contentUrl?: string,
//     content?: any,
//     name?: string,
//     thumbnailUrl?: string,
// }

// export interface IEntity {
//     type?: string,
// }

// export interface IActivity {
//     type?: string,
//     id?: string,
//     serviceUrl?: string,
//     timestamp?: string,
//     localTimestamp?: string,
//     channelId?: string,
//     from?: IChannelAccount,
//     conversation?: IConversationAccount,
//     recipient?: IChannelAccount,
//     replyToId?: string,
//     channelData?: any,
// }

// export interface IMessageActivity extends IActivity {
//     locale?: string,
//     text?: string,
//     summary?: string,
//     textFormat?: string,
//     attachmentLayout?: string,
//     attachments?: IAttachment[],
//     entities?: IEntity[],
// }

// export interface IBotData {
//     eTag: string;
//     data: any;
// }

// export interface IConversation {
//     conversationId: string,
//     history?: IActivity[]
// }

// export interface IBot {
//     botId?: string,
//     botUrl?: string,
//     msaAppId?: string,
//     msaPassword?: string,
//     locale?: string
// }

// export const v30AuthenticationSettings = {
//     tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
//     tokenScope: 'https://graph.microsoft.com/.default',
//     openIdMetadata: 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration',
//     tokenIssuer: 'https://sts.windows.net/72f988bf-86f1-41af-91ab-2d7cd011db47/',
//     tokenAudience: 'https://graph.microsoft.com',
//     stateEndpoint: 'https://state.botframework.com'
// }