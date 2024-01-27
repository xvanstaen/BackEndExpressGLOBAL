
const { MAX_RETRY_DEFAULT } = require("@google-cloud/storage/build/src/storage");
const {GoogleAuth} = require('google-auth-library');
const {OAuth2Client} = require('google-auth-library');
const { Storage } = require("@google-cloud/storage");
const {google} = require('googleapis');
const http = require('http');
const https = require('https');
const url = require('url');


const nodecache = require('node-cache');
var cache = new nodecache;

const fileController = require("./file.controller");
const stdFunctions = require("./stdFunctions");

var credentials = '';

// Access scopes 
const scopes = [
  'https://www.googleapis.com/auth/devstorage.read_write', 'https://www.googleapis.com/auth/devstorage.full_control'
];


async function getClient(projectId){
    const auth = new GoogleAuth({
      scope: scopes,
      projectId: projectId
    });
    const client = await auth.getClient();
  
    const storageOptions = {
      projectId: projectId,
      authClient: client,
    };
    return (new Storage(storageOptions));
  }

const getDefaultCredentials = async (req, res) => {
      const theValue =  await getDefaultCredentialsFn(req.params.projectId);
      if (theValue.status===200){
        res.status(200).send({credentials:theValue.credentials});
      } else {
        res.status(700).send(theValue.err);
      }
  }
  
async function getDefaultCredentialsFn(projectId){
    try {
      if ( cache.has(0)){
          credentials=cache.get(0);
          // credentials.userServerId++
          cache.set(0, credentials)
      } else {
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
  
          cache.set(0, credentials)
          console.log('credentials.creationDate = ' + credentials.creationDate);
      }

      return({status:200,credentials:credentials});
    }
    catch (err) {
      return({status:700,err:err})
    }
  }


async function getCredentialsFn(projectId){
  try {
    if ( cache.has(0)){
        credentials=cache.get(0);
    } else {
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
  theValue = await getCredentialsFn(projectId);
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
    theValue = await getCredentialsFn(req.params.projectId);
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

const requestTokenOAuth2 = async (req, res) => {
    try{
    
      // Generate a url that asks permissions for the Drive activity scope
      const authorizationUrl = oauth2Client.generateAuthUrl({
        // 'online' (default) or 'offline' (gets refresh_token)
        access_type: 'offline', 
          /** Pass in the scopes array defined above.
          * Alternatively, if only one scope is needed, you can pass a scope URL as a string */
        scope: scopes,
  
  
        //response_type:'code',
        // Enable incremental authorization. Recommended as a best practice.
        //include_granted_scopes: true,
  
      });
  
      const server = http.createServer(async function (req, res) {
        try{
        // Example on redirecting user to Google's OAuth 2.0 server.
  
          // res.writeHead(301, { "Location": authorizationUrl });
  
    
        // Receive the callback from Google's OAuth 2.0 server.
        // if (req.url.indexOf('/oauth2callback') > -1) {
        if (req.url.startsWith('/oauth2callback')) {
          // Handle the OAuth 2.0 server response
          let q = url.parse(req.url, true).query;
    
          if (q.error) { // An error response e.g. error=access_denied
            console.log('Error:' + q.error);
          } else { // Get access and refresh tokens (if access_type is offline)
            let { tokens } = await oauth2Client.getToken(q.code);
            oauth2Client.setCredentials(tokens);
            console.info('Tokens acquired.');
            /** Save credential to the global variable in case access token was refreshed.
              * ACTION ITEM: In a production app, you likely want to save the refresh token
              *              in a secure persistent database instead. */
            userCredential = tokens;
            console.log('userCredential='+userCredential);
            return res.status(200).send(userCredential);
           
          }
        }
        res.end();
      }
      catch (err){
        return res.status(882).send({ message: "Pb with authentication", error:err });
      }
      })
    } catch (err){
        return res.status(880).send({ message: "Pb with authentication", error:err });
    }
    
  }
  

  const refreshToken = async (req, res) => {
    const authorizationUrl = oauth2Client.generateAuthUrl({
      // 'online' (default) or 'offline' (gets refresh_token)
      access_type: 'offline', 
        /** Pass in the scopes array defined above.
        * Alternatively, if only one scope is needed, you can pass a scope URL as a string */
      scope: scopes,
      // Enable incremental authorization. Recommended as a best practice.
      //include_granted_scopes: true,
      prompt: 'consent'
    });
    res.writeHead(301, { "Location": authorizationUrl });
   
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
    getNewServerUsrIdFn
    
 
  }