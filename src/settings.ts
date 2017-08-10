export const authenticationSettings = {
    tokenEndpoint: 'https://login.microsoftonline.com/botframework.com/oauth2/v2.0/token',
    openIdMetadata: 'https://login.microsoftonline.com/botframework.com/v2.0/.well-known/openid-configuration',
    tokenIssuer: 'https://sts.windows.net/d6d49420-f39b-4df7-a1dc-d59a935871db/',
    tokenAudience: 'https://api.botframework.com',
    stateEndpoint: 'https://state.botframework.com'
}

export const v30AuthenticationSettings = {
    tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    tokenScope: 'https://graph.microsoft.com/.default',
    openIdMetadata: 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration',
    tokenIssuer: 'https://sts.windows.net/72f988bf-86f1-41af-91ab-2d7cd011db47/',
    tokenAudience: 'https://graph.microsoft.com',
    stateEndpoint: 'https://state.botframework.com'
}

export const speechSettings = {
    tokenEndpoint: 'https://login.botframework.com/v3/speechtoken'
}