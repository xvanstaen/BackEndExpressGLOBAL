
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

const requestDefaultCredentials = async (req, res) => {
      const theValue =  await getDefaultCredentials(req.params.projectId);
      if (theValue.status===200){
        res.status(200).send({credentials:theValue.credentials});
      } else {
        res.status(700).send(theValue.err);
      }
  }
  
async function getDefaultCredentials(projectId){
    try {
  
      if ( cache.has(0)){
          credentials=cache.get(0);
          credentials.userServerId++
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
      /**
      if ( cache.has(0)){
        var myCrypto=cache.get(0);
      } else {
            const storage = await getClient(projectId);
    
            bucket = storage.bucket('xmv-cryptodata');
            bucket.projectId=projectId;

            const [downloadFile] = await bucket.file('cryptoKey').download();
            cache.set(0,JSON.parse(downloadFile))
            myCrypto=JSON.parse(downloadFile);
      }
      */
      return({status:200,credentials:credentials});
      //res.status(200).send({credentials:credentials});
    }
    catch (err) {
      return({status:700,err:err})
        res.status(700).send(err);
    }
  
  
  }



const getCredentials= async (req, res) => {
 
    const auth = new GoogleAuth({
      scope: scopes,
      projectId: req.params.projectId
    });
    const client = await auth.getClient();
    const storageOptions = {
      projectId: req.params.projectId,
      authClient: client,
    };
    const storage = new Storage(storageOptions);
     
    const bucket = storage.bucket(req.query.bucket);
    bucket.projectId=req.params.projectId;
     
    const [metaData] = await bucket.file(req.params.name).getMetadata();
  
    const credentials= {access_token:client.credentials.access_token,id_token:client.credentials.id_token
        , refresh_token:client.credentials.refresh_token, token_type:client.credentials.token_type}
    
    res.status(200).send({credentials:credentials});
  
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
    requestDefaultCredentials,
    getDefaultCredentials,
    checkAccessToken,
    requestTokenOAuth2, // to be tested
    refreshToken,// to be tested
    revokeToken,// to be tested
    
 
  }