Deploy Directline to IIS
1- Install iisnode from https://github.com/tjanczuk/iisnode
2- Install URL rewrite module from https://www.iis.net/downloads/microsoft/url-rewrite
3- Create IIS Web site for DirectLine  and move index.js and web.config to the Web site folder
4- Modify index.js serviceurl parameter with DirectLine IIS site endpoint and botUrl parameter with Bot Api endpoint
5- Deploy Offline WebChat client to IIS. 
6- You can also embed WebChat connector into customer's web site with an iframe. 
	<iframe height="600px" width="400px" src='http://YOURWEBCHATHOST/?s=xxxxxxxxx&botid=YOURBOTID&domain=http://YOURDIRECTLINEHOST/directline'></iframe>
