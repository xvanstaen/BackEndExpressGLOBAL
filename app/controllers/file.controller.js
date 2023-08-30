/* CRUD functions:
create
findAll
findOne
update
delete
deleteAll
findAllPublished
*/


const processFile = require("../middleware/upload");
const { format } = require("util");
const { Storage } = require("@google-cloud/storage");
const { Console } = require("console");
const { stringify } = require("querystring");
const { MAX_RETRY_DEFAULT } = require("@google-cloud/storage/build/src/storage");
const {GoogleAuth} = require('google-auth-library');
const {OAuth2Client} = require('google-auth-library');
// const open = require('open');
//const destroyer = require('server-destroy');
const {google} = require('googleapis');
const http = require('http');
const https = require('https');
const url = require('url');

const CryptoJS = require ('crypto-js');

const nodecache = require('node-cache');
const fs = require('fs');

// Instantiate a storage client with credentials
//const storage = new Storage({ keyFilename: "google-cloud-key.json" });
var storage = new Storage();

var cache = new nodecache;

var oauth2Client = new google.auth.OAuth2(

  "http://localhost:4200/oauth2callback"
);

var credentials = '';

// Access scopes 
const scopes = [
  'https://www.googleapis.com/auth/devstorage.read_write', 'https://www.googleapis.com/auth/devstorage.full_control'
];

async function  enableUniformBucketLevelAccess(bucketName) {
  await storage.bucket(bucketName).setMetadata({
    iamConfiguration: {
      uniformBucketLevelAccess: {
        enabled: true,
      },
    }, 
  });
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

const requestDefaultCredentials = async (req, res) => {
  try {
    if ( cache.has(1)){
       credentials=cache.get(1);
    } else {
       
        const auth = new GoogleAuth({
          scope: scopes,
          projectId: req.params.projectId
        });
        const client = await auth.getClient();
        const url = `https://dns.googleapis.com/dns/v1/projects/${req.params.projectId}`;

        const theResponse = await client.request({ url });
        console.log(theResponse.data);
        
        credentials= {access_token:client.credentials.access_token,id_token:client.credentials.id_token
          , refresh_token:client.credentials.refresh_token, token_type:client.credentials.token_type}

        cache.set(1, credentials)
    }
    if ( cache.has(0)){
      var myCrypto=cache.get(0);
    } else {
      storage = await getClient(req.params.projectId);

        if (req.query.bucket!==''){
            bucket = storage.bucket('xmv-cryptodata');
            bucket.projectId=req.params.projectId;
          } 
        const [downloadFile] = await bucket.file('cryptoKey').download();
        cache.set(0,JSON.parse(downloadFile))
        myCrypto=JSON.parse(downloadFile);
    }

    res.status(200).send({credentials:credentials});
  }
  catch (err) {
      res.status(700).send(err);
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

const getFileContent = async (req, res) => {
  try {
    const storage = await getClient(req.params.projectId);

    if (req.query.bucket!==''){
      bucket = storage.bucket(req.query.bucket);
      bucket.projectId=req.params.projectId;
    } 
    /**
    const [metaData] = await bucket.file(req.params.name).getMetadata();
    console.log("File found & link is " + metaData.mediaLink);
    res.redirect(metaData.mediaLink);
     */

    const [downloadFile] = await bucket.file(req.params.name).download();
    res.status(200).send(JSON.parse(downloadFile));

  }
  catch (err) {
    
    console.log("Could not get the file. " + err);
    res.status(404).send( { message:"Could not get the file. ", error: err } );
  }
};

async function getUserPswRecord(projectId, userId){
  const storage = await getClient(projectId);
  const bucket = storage.bucket('manage-login');
  bucket.projectId=projectId;

  const [downloadFile] = await bucket.file(userId+'PSW.json').download();

  const decrypt = await getDecrypt(JSON.parse(downloadFile).psw , JSON.parse(downloadFile).key, JSON.parse(downloadFile).method ,0)
  return ({data:decrypt, bucketUserInfo:JSON.parse(downloadFile).bucketUserInfo});
}


const  checkLogin = async (req, res) => {
  try {
    const myDecrypt = await getUserPswRecord(req.params.projectId,req.params.userId );
    
    if (myDecrypt.data === "Key invalid" || myDecrypt.data !== req.params.psw){
      res.status(700).send({error:"invalid request"});
    } else {
      const storage = await getClient(req.params.projectId);
      const bucket = storage.bucket(myDecrypt.bucketUserInfo);
      bucket.projectId=req.params.projectId;
      const [downloadFile] = await bucket.file(req.params.userId+'.json').download();
      res.status(200).send(JSON.parse(downloadFile));
    }
  }
  catch (err) {
    console.log("Could not get the file. " + err);
    res.status(404).send( { message:"Could not get the file. ", error: err } );
  }
}


const  encryptFn = async (req, res) => {
  try {
    const cryptAuth = JSON.parse(req.params.inAuth);
    if (cryptAuth.userId !== undefined && cryptAuth.psw !== undefined && cryptAuth.crypto !== undefined){
        if (cryptAuth.crypto === true){  
          const myDecrypt = await getUserPswRecord(req.params.projectId,cryptAuth.userId );
            if (myDecrypt.data === "Key invalid" || myDecrypt.data !== cryptAuth.psw){
                  res.status(701).send({error:"invalid request"});
            } else {
              const encrypt = await getEncrypt(req.params.inData, req.params.inKey, req.params.inMethod, 0);
              res.send({response:encrypt});
            } 
        } else {
          res.status(702).send({error:"invalid request"});
        }
    } else {
        res.status(702).send({error:"invalid request"});
      }
  }
  catch (err){
    res.status(700).send('pb with encryptFn');
  }
}

const  decryptFn = async (req, res) => {
  try {
    const cryptAuth = JSON.parse(req.params.inAuth);
    if (cryptAuth.userId !== undefined && cryptAuth.psw !== undefined && cryptAuth.crypto !== undefined){
      if (cryptAuth.crypto === true){  
          const myEncrypt = await getUserPswRecord(req.params.projectId,cryptAuth.userId );
          if (myEncrypt.data === "Key invalid" || myEncrypt.data !== cryptAuth.psw){
                res.status(701).send({error:"invalid request"});
          } else {
            const decrypt = await getDecrypt(req.params.inData, req.params.inKey, req.params.inMethod, 0);
            res.send({response:decrypt});
          }
      } else {
          res.status(702).send({error:"invalid request"});
      }
    } else {
        res.status(702).send({error:"invalid request"});
    }
    }
    catch (err){
      res.status(700).send('pb with decryptFn');
    }
}

async function getEncrypt(Decrypt, key, method, i_theFour){
    if ( cache.has(0)){
      var myCrypto=cache.get(0);
    } else {
        const [downloadFile] = await bucket.file('cryptoKey').download();
        cache.set(0,JSON.parse(downloadFile))
        myCrypto=JSON.parse(downloadFile);
    }
  if (key > -1 && key <myCrypto.tab.length){
      var myKey=myCrypto.tab[key-1].theKey;
  } else {
    Encrypt='Key invalid';
    return(Encrypt);
  }
  const IV = myCrypto.theFour[i_theFour]; 
  const keyHex = CryptoJS.enc.Utf8.parse(myKey);
  const iv = CryptoJS.enc.Utf8.parse(IV);
  const mode = CryptoJS.mode.CBC;
  var Encrypt='';
  if (method==='DES'){
      // ==== DES
    Encrypt = CryptoJS.TripleDES.encrypt(Decrypt, keyHex, { iv, mode }).toString();
    } else if (method==='AES'){
          // ==== AES
          Encrypt=CryptoJS.AES.encrypt(Decrypt, myKey).toString();
          } 
         //console.log('Encrypt function: decrypt ', Decrypt, 'Method  ', method, 'encrypt', Encrypt);
    return(Encrypt);
}


async function getDecrypt(Encrypt, key, method, i_theFour){
  
    if ( cache.has(0)){
      var myCrypto=cache.get(0);
    } else {
        const [downloadFile] = await bucket.file('cryptoKey').download();
        cache.set(0,JSON.parse(downloadFile))
         myCrypto=JSON.parse(downloadFile);
    }

  if (key > -1 && key <myCrypto.tab.length){
    var myKey=myCrypto.tab[key-1].theKey;
  } else {
    Decrypt='Key invalid';
    return(Decrypt);
  }
  const IV = myCrypto.theFour[i_theFour]; 
  const keyHex = CryptoJS.enc.Utf8.parse(myKey);
  const iv = CryptoJS.enc.Utf8.parse(IV);
  const mode = CryptoJS.mode.CBC;
  var Decrypt='';
  if (method==='DES'){
    // ==== DES
    Decrypt = CryptoJS.TripleDES.decrypt(Encrypt, keyHex, { iv, mode }).toString(CryptoJS.enc.Utf8);
  } else if (method==='AES'){
        // ==== AES
        Decrypt=CryptoJS.AES.decrypt(Encrypt, myKey).toString(CryptoJS.enc.Utf8);
        } 
        //console.log('Decrypt function: decrypt ', Decrypt, 'Method  ', method, 'encrypt', Encrypt);
  return(Decrypt); 
}

const upload =async (req, res) => {
  try {
    //console.log(' ===> upload');
    const storage = await getClient(req.params.projectId);
   
    const bucket = storage.bucket(req.query.bucket);
    bucket.projectId=req.params.projectId;
    enableUniformBucketLevelAccess(req.query.bucket);
    
    await processFile(req, res);
    if (!req.file) {
      return res.status(400).send({ message: "Please upload a file!" });
    }

    // Create a new blob in the bucket and upload the file data. req.params.name
    const blob = bucket.file(req.file.originalname);

    if (req.params.contentType==='json') {
      var theType='application/json';
    }
    const blobStream = blob.createWriteStream({
      metadata: {
        //cacheControl: 'public,max-age=0,no-cache,no-store',
        //contentType: 'application/json'
        cacheControl: req.params.cacheControl,
        contentType: theType
      },
      resumable: false,
    });

    blobStream.on("error", (err) => {
      res.status(505).send({ message: err.message });
    });
    blobStream.on("finish", async (data) => {
      // Create URL for directly file access via HTTP.
      /** THIS IS NEEDED ONLY IF OBJECT IS NOT PUBLIC 
       ** NOT NEEDED IN THE WAY SECURITY ACCESS IS SET UP AT OBJECT LEVEL 
      const publicUrl = format(
        `https://storage.googleapis.com/${bucket.name}/${blob.name}`
      );
      try {
        // Make the file public
        await bucket.file(req.file.originalname).makePublic();
        next();
      } 
      catch (err){
          if (err.code == "LIMIT_FILE_SIZE") {
            return res.status(500).send({
              message: "File size cannot be larger than 2MB!",
            });
          }
          return res.status(500).send({
                message:
                `Could not upload the file: ${req.file.originalname}. ${err}`,
                 // `Uploaded the file successfully: ${req.file.originalname}, but public access is denied!`,
                //url: publicUrl,
          });
        }
         */

        res.status(200).send({
          message: "Uploaded the file successfully: " + req.file.originalname
        });

    });
    blobStream.end(req.file.buffer);
  } catch (err) {
    res.status(515).send({
      message: `Could not upload the file: ${req.file.originalname}. ${err}`,
    });
  }
};

const updateMeta = async (req, res) => {
  const storage = await getClient(req.params.projectId);
  const bucket = storage.bucket(req.query.bucket);
  bucket.projectId=req.params.projectId;

  try {
    const [metaData] = await bucket.file(req.params.name).setMetadata(req.params.newMetaData);

    res.status(200).send({
      message: "MetaData successfully updated "
    });
  } catch (err) {
    res.status(500).send({
      message: "MetaData not updated - returned error is " + err
    });
  }
}

const getListFiles = async (req, res) => {
  try {
    const storage = await getClient(req.params.projectId);
   
    const bucket = storage.bucket(req.query.bucket);
    bucket.projectId=req.params.projectId;
    const [files] = await bucket.getFiles();
    let fileInfos = [];
    files.forEach((file) => {
      fileInfos.push({
        name: file.name,
        url: file.metadata.mediaLink,
      });
    });
    res.status(200).send(fileInfos);
  } catch (err) {
    res.status(500).send({
      message: "Unable to read list of files!",
    });
  }
};



const getListMetaDataFiles = async (req, res) => {
  try {
    const storage = await getClient(req.params.projectId);
   
    const bucket = storage.bucket(req.query.bucket);
    bucket.projectId=req.params.projectId;
    const [files] = await bucket.getFiles();
    let fileInfos = [];
    files.forEach((file) => {
      fileInfos.push({
        items: file.metadata,
      });
    });
    res.status(200).send(fileInfos);
  } catch (err) {
    console.log(err);
    res.status(500).send({
      message: "Unable to read list of files!",
    });
  }
};

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


const getObjectMeta = async (req, res) => {
  try {
    const storage = await getClient(req.params.projectId);
   
    const bucket = storage.bucket(req.query.bucket);
    bucket.projectId=req.params.projectId;
    const [metaData] = await bucket.file(req.params.name).getMetadata();
    res.status(200).send(metaData);
    
  } catch (err) {
    res.status(500).send({
      message: "Could not download the file. " + err,
    });
  }
};

const listBuckets = async (req, res) => {
  try {
    const storage = await getClient(req.params.projectId);
    storage.projectId=req.params.projectId;
    const [buckets] = await storage.getBuckets();
    let BuckInfos = [];
    buckets.forEach(bucket => {
      BuckInfos.push({
        name: bucket.name
      });
    });
    res.status(200).send(BuckInfos);
  } catch (err) {
    res.status(500).send({
      message: "Could not find the buckets " + err,
    });
  }
};

const copyObject = async (req, res) => {
  try {
    const storage = await getClient(req.params.projectId);
    const bucket = storage.bucket(req.query.bucket);
    bucket.projectId=req.params.projectId;
    await bucket.file(req.params.SRCname)
    .copy(storage.bucket(req.params.DESTbucket).file(req.params.DESTname));

    res.status(200).send({
      message: "Object is copied as" + req.params.DESTname + ' in bucket ' + req.params.DESTbucket
    });
  } catch (err) {
    res.status(505).send({
      message: "Could not copy the object " + err,
    });
  }
};

const moveObject = async (req, res) => {
  try {
    var DestBucket=req.params.DESTbucket;
    var DestObject=req.params.DESTname;
    var SRCObject=req.params.SRCname;
    const storage = await getClient(req.params.projectId);
    const  bucket = storage.bucket(req.query.bucket);
    bucket.projectId=req.params.projectId;
    await bucket.file(req.params.SRCname)
    .move(storage.bucket(req.params.DESTbucket).file(req.params.DESTname));
    res.status(200).send({
      message: "Object moved to bucket " + req.params.DESTbucket
    });
  } catch (err) {
    res.status(502).send({
      message: "Could not move the object to bucket " + req.params.DESTbucket + 
      'Parameters: DESTbucket=' + DestBucket + 
      ' SRCobject=' + SRCObject  + ' Destobject=' + DestObject + ' error='+ err,
    });
  }
};

const renameObject = async (req, res) => {
  try {
    const storage = await getClient(req.params.projectId);
    const bucket = storage.bucket(req.query.bucket);
    bucket.projectId=req.params.projectId;
    await bucket.file(req.params.SRCname)
    .rename(req.params.DESTname);
    res.status(200).send({
      message: "Object is renamed "
    });
  } catch (err) {
    res.status(500).send({
      message: "Could not rename the object " + err,
    });
  }
};



const deleteObject = async (req, res) => {
  try {
    const storage = await getClient(req.params.projectId);
    const bucket = storage.bucket(req.query.bucket);
    bucket.projectId=req.params.projectId;
    await bucket.file(req.params.name)
    .delete();
    res.status(200).send({
      message: "Object is deleted "
    });
  } catch (err) {
    res.status(500).send({
      message: "Could not delete the object " + err,
    });
  }
};

const updateFileSystem = async (req, res) => {
  try {
      console.log('===> in updateFileSystem()');

      const bucketFileSystem = storage.bucket(req.query.bucket);
      bucketFileSystem.projectId=req.params.projectId;
      bucketFileSystem.id=req.query.bucket;
      bucketFileSystem.name=req.query.bucket;
      // enableUniformBucketLevelAccess(req.query.bucket);

      let tabLock=JSON.parse(req.params.tabLock);
      //console.log(req.params.tabLock);

      if ( bucketFileSystem.id !== req.query.bucket){
          console.log('wrong Bucket has been accessed' + bucketFileSystem.id + '   tabLock[0].action=' + tabLock[0].action);
          return res.send({message: 'wrong Bucket has been accessed' + '  tabLock[0].action=' + tabLock[0].action, err: 888})
        }
      var theStatus = [];
      var onDestroy=false;
        
        //console.log('theFileParse=',theFileParse);
      if (tabLock[0].action==='onDestroy'  ){
          
        onDestroy=true;

        for (var iWait=0; iWait<tabLock.length; iWait++){
              
          if (tabLock[iWait].lock===1){
              console.log('onDestroy - bucket=' + tabLock[iWait].bucket + '  object=' + tabLock[iWait].object + ' file system=' + tabLock[iWait].objectName);
              tabLock[iWait].action='unlock';
              const [fileData] = await bucketFileSystem.file(tabLock[iWait].objectName).download();
                  
              theStatus =checkDataOnDestroy(JSON.parse(fileData), tabLock[iWait]);
              if (typeof theStatus === 'object'){
                  await bucketFileSystem.file(tabLock[iWait].objectName).save(JSON.stringify(theStatus));
                  try{
                    const newMetadata = {
                      cacheControl: 'public,max-age=0,no-cache,no-store',
                      contentType: 'application/json'
                    };
                      await bucketFileSystem.file(tabLock[iWait].objectName).setMetadata(newMetadata);
                      
                    }
                  catch (err) {
                        console.log('after save is a failure ' + err);
                      
                    }
              }
          }
        }
        return res.send({message:"on Destroy is completed", status:999});
      } else {
        return res.send({message:"wrong action ; onDestroy was expected", error:998});
      }
    }
  catch (err) {
    console.log('global failure ' + err);
    return res.send({message:"global failure", error:999});
     
  } 
   
};


function checkDataOnDestroy(fileSystem, tabLock){
  if (fileSystem.length > 0 ){
    for (var i=0; i<fileSystem.length && (fileSystem[i].object!==tabLock.object || fileSystem[i].bucket!==tabLock.bucket); i++){}
    if (i===fileSystem.length ){
      // record is not found so cannot be unlocked
      console.log('record not found, so cannot be unlocked - Error 700');
      return (700);
  } else { // record is found; delete it
    if (tabLock.createdAt === fileSystem[i].createdAt) {
      fileSystem.splice(i,1);
      return (fileSystem);
    } else {
      console.log('record found but createdAt is different ,  so cannot be unlocked - Error 710');
      return (710);
    }
  }
  } else {
      return (700);
    }
}




module.exports = {
  upload,
  getListFiles,
  getFileContent,
  getObjectMeta,
  listBuckets,
  updateMeta,
  deleteObject,
  renameObject,
  getListMetaDataFiles,
  moveObject,
  copyObject,
  updateFileSystem,
  requestDefaultCredentials,
  requestTokenOAuth2,
  refreshToken,
  revokeToken,
  checkAccessToken,
  getCredentials,
  checkLogin,
  encryptFn,
  decryptFn
  
};