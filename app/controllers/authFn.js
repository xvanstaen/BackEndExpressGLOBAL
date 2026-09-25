
const { MAX_RETRY_DEFAULT } = require("@google-cloud/storage/build/src/storage");
const {GoogleAuth} = require('google-auth-library');
const {OAuth2Client} = require('google-auth-library');
const { Storage } = require("@google-cloud/storage");


const crypto = require('crypto');
const {google} = require('googleapis');
const http = require('http');
const https = require('https');
const url = require('url');
//const destroyer = require('server-destroy');

const nodecache = require('node-cache');
var cache = new nodecache;
var openAuthUrl=false;
const fileController = require("./file.controller");
const stdFunctions = require("./stdFunctions");

var cachePort = new nodecache;
var cacheKey = new nodecache;
var credentials = '';
var newCredentials="";

// Access scopes 
const scopes = [
  'https://www.googleapis.com/auth/devstorage.read_write', 'https://www.googleapis.com/auth/devstorage.full_control'
];



async function getClient(projectId){    
  // Initialize the Secret Manager client
   
    return( new Storage())
    // return( new Storage({ keyFilename: "/Users/xaviervanstaen/JsonServer/GoogleStorage/clientsecret.json" }) );
    /*
    const auth = new google.auth. GoogleAuth({
      scope: scopes,
      include_granted_scopes: true,
      access_type: 'offline',
      projectId: projectId
    });
    
    const client = await auth.getClient();

    const storageOptions = {
      projectId: projectId,
      authClient: client,
    };

    return (new Storage(storageOptions));
    */
  }

const getDefaultCredentials = async (req, res) => {
      const theValue =  await getDefaultCredentialsFn(req.params.projectId,req.params.reset);
      if (theValue.status===200){
        res.status(200).send({credentials:theValue.credentials});
      } else {
        res.status(700).send(theValue.err);
      }
  }
  
async function getDefaultCredentialsFn(projectId,reset){
    try {
      if ( cache.has(1) && reset===false){
        credentials=cache.get(1);
      } else {
          if ( cache.has(1) ){
              cache.del(1);
          }
          const auth = new GoogleAuth({
            scope: scopes,
            projectId: projectId
          });
          const client = await auth.getClient();
          const url = `https://dns.googleapis.com/dns/v1/projects/${projectId}`;
  
          const theResponse = await client.request({ url });
          // console.log(theResponse.data);

          const myDate = stdFunctions.defineMyDate();
          credentials= {access_token:client.credentials.access_token,id_token:client.credentials.id_token
            , refresh_token:client.credentials.refresh_token, token_type:client.credentials.token_type, userServerId:0, creationDate:myDate}
  
          cache.set(1, credentials)
          console.log('credentials.creationDate = ' + credentials.creationDate);
      }

      return({status:200,credentials:credentials});
    }
    catch (err) {
      return({status:700,err:err})
    }
  }


async function getCredentialsFn(projectId,reset){
  try {
      if ( cache.has(0) && reset===false){
        credentials=cache.get(0);
    } else {
        if ( cache.has(0) ){
            cache.del(0);
        }
        const auth = new GoogleAuth({
          scope: scopes,
          projectId: projectId
        });
        const client = await auth.getClient();
        const myDate = stdFunctions.defineMyDate();
        credentials= {access_token:"",id_token:"", refresh_token:"", 
            token_type:"", userServerId:0, creationDate:myDate}

        if (client.credentials.access_token!==undefined){
          credentials.access_token = client.credentials.access_token,id_token;
        } else { credentials.access_token="";}

        if (client.credentials.id_token!==undefined){
          credentials.id_token = client.credentials.id_token;
        } else { credentials.id_token="";}

        if (client.credentials.refresh_token!==undefined){
          credentials.refresh_token = client.credentials.refresh_token;
        } else { credentials.refresh_token="";}

        if (client.credentials.token_type!==undefined){
          credentials.token_type = client.credentials.token_type;
        } else { credentials.token_type="";}

        cache.set(0, credentials)
        console.log('credentials.creationDate = ' + credentials.creationDate);
    }
    return({status:200,credentials:credentials});
  }
  catch (err) {
    return({status:700,err:err})

  }
}

async function getNewServerUsrIdFn(projectId){
  theValue = await getCredentialsFn(projectId,false);
  if (theValue.status===200){
    credentials=theValue.credentials;
    credentials.userServerId++
    cache.set(0, credentials);
    return({status:200,credentials:credentials});  
  }  else {
    return theValue;
  }
}

const getCredentials= async (req, res) => {
  try{
    theValue = await getCredentialsFn(req.params.projectId,req.params.reset);
    return res.send(theValue);
  }
  catch (err){
    return res.send({status:700,err:err});
  }
}

const getNewServerUsrId = async (req, res) => {
  try{
    theValue = await getNewServerUsrIdFn(req.params.projectId);
    return res.send(theValue);
  }
  catch (err){
    return({status:700,err:err})
  }
}

const  checkAccessToken = async (req, res) => {
    // after acquiring an oAuth2Client...
    const auth = new GoogleAuth({
      scope: scopes,
      projectId: req.params.projectId
    });
    const client = await auth.getClient();
    const tokenInfo = await client.getTokenInfo(req.params.accessToken);

    // take a look at the scopes originally provisioned for the access token
    console.log("tokenInfo="+tokenInfo.scopes);
    return res.status(200).send(tokenInfo);
}

async function getAuthenticatedClient(redirectUri) {
  const { default: open } = await import('open');
  return new Promise((resolve, reject)  => {
     // ******* TO BE REVIEWED WITH THE USAGE OF THE SECURITY_KEY
     // *******
        const OAUTH_CLIENT = '';
        const OAUTH_SECRET = '';
        //const redirect="http://localhost:4200/oauth2callback";

        const oAuth2Client = new OAuth2Client(
          OAUTH_CLIENT, //keys.web.client_id,
          OAUTH_SECRET, //keys.web.client_secret,
          redirectUri //keys.web.redirect_uris[0]
        );
        var authorizeUrl = oAuth2Client.generateAuthUrl({
          // 'online' (default) or 'offline' (gets refresh_token)
          access_type: 'offline', 
            /** Pass in the scopes array defined above.
            * Alternatively, if only one scope is needed, you can pass a scope URL as a string */
          scope: scopes,
          response_type:'code',
          // Enable incremental authorization. Recommended as a best practice.
          include_granted_scopes: true
    
        });
/*
        var Aserver = http.createServer((req, res) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          let qs = url.parse(req.url, true).query;
          console.log('Error bis:' + qs.err + "  URL=" + req.url,);
          //const code = qs.get('code');
          //console.log(`Code is ${code}`);
          var listened = false;
          if (Aserver.listening===true){
            listened=true;
          }
          res.end(JSON.stringify({
            data: "   ==> this is the reponse provided by 'requestListener'; value of url.parse(req.url, true).query = " 
              + req.url + " listening port 4000 = " + listened
          })
          );
          Aserver.close();
        });
        const theUrl="http://localhost:4000/";
        Aserver.listen({port:4000}, async function(){open("http://localhost:4000/" , {wait: false}).then(cp => cp.unref());
*/

        // const server = http.createServer(async function (areq, ares) {})
        var trouve=false;
        for (var i=0; i<2; i++ ){
          if (cachePort.has(i) && cachePort.get(i)==3000){
            trouve=true;
          }
        }
      if (trouve===false){
        const server = http
        .createServer((req, res) => {
          // Example on redirecting user to Google's OAuth 2.0 server.
          try{
              res.writeHead(301, { "Location": authorizeUrl });
              console.log('requestListener');
              // Receive the callback from Google's OAuth 2.0 server.
              // if (req.url.indexOf('/oauth2callback') > -1) {
              // if (req.url.startsWith('/oauth2callback')) {
              // Handle the OAuth 2.0 server response
              const qs = url.parse(req.url, true).query;
              //const code = qs.get('code');
              //console.log(`Code is ${code}`);
              res.end('Authentication successful! Please return to the console.');
              server.close();
        /*
              if (qs.error) { // An error response e.g. error=access_denied
                console.log('Error redirect:' + qs.error);
              } else { // Get access and refresh tokens (if access_type is offline)
                var { r } = await oAuth2Client.getToken(qs.code);
                oAuth2Client.setCredentials(r.tokens);
                console.info('Tokens acquired.');
                // Save credential to the global variable in case access token was refreshed.
                //  * ACTION ITEM: In a production app, you likely want to save the refresh token
                //  *              in a secure persistent database instead. 
                
         */       
                console.log('userCredential='+tokens);
                resolve(oAuth2Client);
              }
        // }
          catch (err){
              server.close();
              reject (err);
            }
          })
        .listen({port:3000}, async function(){
          //  open(authorizeUrl)
            
            open(authorizeUrl , {wait: false}).then(cp => cp.unref());
            console.log(server.address());
            cachePort.set(0,3000);
        });
      }
    });
}

const requestTokenOAuth2 = async (req, res) => {
      try{
          const oAuth2Client = await getAuthenticatedClient(req.params.reDirect);
          const url = 'https://people.googleapis.com/v1/people/me?personFields=names';
          const res = await oAuth2Client.request({url});
          const tokenInfo = await oAuth2Client.getTokenInfo(
            oAuth2Client.credentials.access_token
          );
          console.log(tokenInfo);
          console.log(res.data);
          return res.send({status:200, message:"check if Auth2 works"});
      } 
      catch (err){
          return res.status(999).send({ message: "Pb with authentication", error:err });
      }
  }
  

  const refreshToken = async (req, res) => {
    const OAUTH_CLIENT = '';
      const OAUTH_SECRET = '';
      //const redirect="http://localhost:4200/oauth2callback";
      const redirectUri=req.params.reDirect

      // ******** TO BE REVIEWED ********
      const oAuth2Client = new OAuth2Client(
        OAUTH_CLIENT, //keys.web.client_id,
        OAUTH_SECRET, //keys.web.client_secret,
        redirectUri //keys.web.redirect_uris[0]
      );
    const authorizeUrl = oAuth2Client.generateAuthUrl({
      // 'online' (default) or 'offline' (gets refresh_token)
      access_type: 'offline', 
        /** Pass in the scopes array defined above.
        * Alternatively, if only one scope is needed, you can pass a scope URL as a string */
      scope: scopes,
      // Enable incremental authorization. Recommended as a best practice.
      include_granted_scopes: true,
      prompt: 'consent'
    });
    res.writeHead(301, { "Location": authorizeUrl });
    //return res.status(200).send("OK");
  }
  
  const revokeToken = async (req, res) => {
  }
  
 
  


  module.exports = {
    getClient,
    getCredentials,
    getCredentialsFn,
    getDefaultCredentials,
    getDefaultCredentialsFn,
    checkAccessToken,
    requestTokenOAuth2, // to be tested
    refreshToken,// to be tested
    revokeToken,// to be tested
    getNewServerUsrId,
    getNewServerUsrIdFn,
    
 
  }