


const processFile = require("../middleware/upload");
const { format } = require("util");
const { Storage } = require("@google-cloud/storage");
const { Console } = require("console");
const { stringify } = require("querystring");
const { MAX_RETRY_DEFAULT } = require("@google-cloud/storage/build/src/storage");

// const open = require('open');
//const destroyer = require('server-destroy');
const {google} = require('googleapis');
const http = require('http');
const https = require('https');
const url = require('url');

const nodecache = require('node-cache');
var cache = new nodecache; // used for the content of the file

const authFn = require("./authFn");
const stdFunctions = require("./stdFunctions");
const cryptoFn = require("./cryptoFn");
const configData = require("./tutorial.controller");
const cacheFn = require("./cacheFunctions.js");
const cacheConsole = require("./cacheConsole.js");
const securityCtrl = require("./securityCtrl.js");

var bucketCrypto='xmv-cryptodata';
var bucketLogin='manage-login';

// Instantiate a storage client with credentials
// const storage = new Storage();

async function  enableUniformBucketLevelAccess(bucketName, storage) {
  await storage.bucket(bucketName).setMetadata({
    iamConfiguration: {
      uniformBucketLevelAccess: {
        enabled: true,
      },
    }, 
  });
}



const getMedialinkContent = async (req, res) => {
  try{
    if (req.query.bucket === bucketCrypto || req.query.bucket === bucketLogin){
      const securityLevel= await securityCtrl.getSecurityAccess(req.params.projectId, req.params.userId,req.params.userPSW);
      if (securityLevel.status!==200){
        return res.send(securityLevel);
      } 
      if (securityLevel.accessLevel!=='Very High'){
        return res.send({status:585,msg:"you don't have the right level of security access"});
      }
    }
    //const storage = await authFn.getClient(req.params.projectId);
    const storage = new Storage();
    var bucket = storage.bucket(req.query.bucket);
    bucket.projectId=req.params.projectId;
    const [metaData] = await bucket.file(req.params.name).getMetadata();
    console.log("File searched at " + metaData.mediaLink);
    try {
      return res.redirect(metaData.mediaLink);
    }
    catch(err){
      console.log("Could not get the file " + metaData.mediaLink + '  error==>' + err);
      return res.status(405).send( { status:405, msg:"Could not get the file " + metaData.mediaLink, error: err } );
    }
  }
  catch (err){
    return res.send({status:700,msg:'System failure ' + err})
  }
}
/******************************************************************************

                          text file formats supported are :
                          -----------------------------------
                          ===> Macintosh Formtted Text.txt
                          ===> Tab-delimited text.txt
                          ===> .txt
                          ===> DOS.txt

********************************************************************************/
const getTextFile= async (req, res) => {
  try{
    const storage = await authFn.getClient(req.params.projectId);
    var bucket = storage.bucket(req.query.bucket);
    bucket.projectId=req.params.projectId;
  
    const [downloadFile] = await bucket.file(req.params.name).download();
    try{

      var myData={text:""};
      myData.text=downloadFile.toString();
      return res.status(200).send(myData);
    }
    catch(err){
      console.log("Could not get the file " +req.params.name + '  error==>' + err);
      return res.status(405).send( { status:405, msg:"Could not get the file. ", error: err } );
    }
  }
  catch (err){
    return res.send({status:700,msg:'System failure ' + err})
  }
}

const getFileContent = async (req, res) => {
  try {
    if (req.query.bucket === bucketCrypto || req.query.bucket === bucketLogin){
      const securityLevel= await securityCtrl.getSecurityAccess(req.params.projectId, req.params.userId,req.params.userPSW);
      if (securityLevel.status!==200){
        return res.send(securityLevel);
      } 
      if (securityLevel.accessLevel!=='Very High'){
        return res.send({status:585,msg:"you don't have the right level of security access"});
      }
    }
    const theValue=await cacheFn.cacheFiles(req.params.testProd, req.params.name, req.query.bucket);
    var listFiles=theValue.tab;
    const i = theValue.record;
    if (i<listFiles.length  && (cache.get(i)) && listFiles[i].updated===false) {
        console.log('retrieve file  ' + req.params.name + ' from cache ' + i);

        //cacheConsole.fillCacheConsole('getFileContent','retrieve file '+ req.params.name + ' from cache ' + i + " listFiles=","listFiles");
        
        return res.status(200).send(cache.get(i));
    } 
    //const storage = await authFn.getClient(req.params.projectId);
    const storage = new Storage();
    var bucket = storage.bucket(req.query.bucket);
    bucket.projectId=req.params.projectId;
  
   
    console.log('retrieve file '+ req.params.name);
    //cacheConsole.fillCacheConsole('getFileContent','retrieve file '+ req.params.name ,listFiles);
    const [downloadFile] = await bucket.file(req.params.name).download();        
    try{
      const theJson=JSON.parse(downloadFile)
      if (i<listFiles.length){
          cacheFn.fillCacheFileUpdate(i,false);
          cache.set(i,theJson);
          console.log('retrieved file  ' + req.params.name + ' & update of cache ' + i);
      }
      return res.status(200).send(theJson);
    } 
    catch(err){
      var myData={text:""};
      myData.text=downloadFile.toString();
      return res.status(200).send(myData);
    }
  }
  catch (err) {
    console.log("Could not get the file " +req.params.name + '  error==>' + err);
    return res.send({status:700,msg:'System failure ' + err});
  }
};




const  checkLogin = async (req, res) => {
  try {
    const myDecrypt = await securityCtrl.getUserPswRecord(req.params.projectId,req.params.userId );
    
    if (myDecrypt.data === "Key invalid" ){
      return res.status(520).send({msg:"invalid id/psw", status:520});
    } 
    //const thePSW = await cryptoFn.getDecrypt(req.params.psw, myDecrypt.key, myDecrypt.method, myDecrypt.iFour, req.params.projectId);
    if (myDecrypt.data !== req.params.psw){
      return res.status(520).send({msg:"invalid id/psw", status:520});
    }
    const storage = await authFn.getClient(req.params.projectId);
    var bucket = storage.bucket(myDecrypt.bucketUserInfo);
    bucket.projectId=req.params.projectId;
    const [downloadFile] = await bucket.file(req.params.userId+'.json').download();
    var identifRecord=JSON.parse(downloadFile);
    identifRecord.secLevel=myDecrypt.securityLevel;
    return res.status(200).send(identifRecord);
  }
  catch (err) {
    console.log("CHECK LOGIN - could not get the file. " + err);
    return res.send({status:700,msg:'System failure ' + err})
  }
}
const uploadFromMemory =async (req, res) => {
  if (req.query.bucket === bucketCrypto || req.query.bucket === bucketLogin){
    const securityLevel= await securityCtrl.getSecurityAccess(req.params.projectId, req.params.userId,req.params.userPSW);
    if (securityLevel.status!==200){
      return res.send(securityLevel);
    } 
    if (securityLevel.accessLevel!=='Very High'){
      return res.send({status:585,msg:"you don't have the right level of security access"});
    }
  }
  //const storage = await authFn.getClient(req.params.projectId);
  const storage = new Storage();
  var bucket = storage.bucket(req.query.bucket);
  bucket.projectId=req.params.projectId;
  enableUniformBucketLevelAccess(req.query.bucket, storage);
  try{
    await processFile(req, res);
    await storage.bucket(req.query.bucket).file(req.params.name).save(req.body.file);
    return res.status(200).send({msg: "Uploaded the file successfully: " + req.params.name});
  } 
  catch (err){
    return res.send({status:600,msg:'File could not be saved ' + err})
  }
}

const upload =async (req, res) => {
    //console.log(' ===> upload');
  try {
      if (req.query.bucket === bucketCrypto || req.query.bucket === bucketLogin){
        const securityLevel= await securityCtrl.getSecurityAccess(req.params.projectId, req.params.userId,req.params.userPSW);
        if (securityLevel.status!==200){
          return res.send(securityLevel);
        } 
        if (securityLevel.accessLevel!=='Very High'){
          return res.send({status:585,msg:"you don't have the right level of security access"});
        }
      }
      
    //const storage = await authFn.getClient(req.params.projectId);
    const storage = new Storage();
    var bucket = storage.bucket(req.query.bucket);
    bucket.projectId=req.params.projectId;
    enableUniformBucketLevelAccess(req.query.bucket, storage);
    
    await processFile(req, res);
    if (!req.file) {
      return res.status(405).send({status:405, msg: "Please upload a file!" });
    }

    // Create a new blob in the bucket and upload the file data. req.params.name
    const blob = bucket.file(req.file.originalname);

    const blobStream = blob.createWriteStream({
      metadata: {
        cacheControl: req.params.cacheControl,
        contentType: req.params.contentType
      },
      resumable: false,
    });

    blobStream.on("error", (err) => {
      return res.status(505).send({ status:505, msg: err.message });
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


        const theValue=await cacheFn.cacheFiles(req.params.testProd, req.params.name,req.query.bucket);
        var listFiles=theValue.tab;
        const i = theValue.record;
        if (i<listFiles.length  && listFiles[i].file === req.params.name && listFiles[i].bucket === req.query.bucket) {
            console.log('flag field updated to true for file ' + req.params.name + ' in cache nb' + i);
            //listFiles[i].updated=true;
            //tabFile.set(0, listFiles);
            cacheFn.fillCacheFileUpdate(i,true);
        }
        return res.status(200).send({
          msg: "Uploaded the file successfully: " + req.file.originalname
        });
    });
    blobStream.end(req.file.buffer);
  } 
  catch (err) {
    return res.send({status:700,msg:'System failure ' + err})
  }
};




const uploadMetaPerso =async (req, res) => {
  try {
    //cacheConsole.fillCacheConsole('uploadMetaPerso','in uploadMetaPerso',"");
    //const storage = await authFn.getClient(req.params.projectId);
    const storage = new Storage();
    var bucket = storage.bucket(req.query.bucket);
    bucket.projectId=req.params.projectId;
    enableUniformBucketLevelAccess(req.query.bucket, storage);
    
    await processFile(req, res);
    if (!req.file) {
      return res.status(405).send({ status:405, msg: "Please upload a file!" });
    }

    // Create a new blob in the bucket and upload the file data. req.params.name
    const blob = bucket.file(req.file.originalname);

    var tabMeta=JSON.parse(req.params.metaPerso);
 
    if (Array.isArray(tabMeta) === false) {
      tabMeta=[];
    }
  
    const cacheCtrl='"cacheControl":"';
    const theType='"contentType":"';
    const theMeta='"metadata":{';
    var myMetaStr=theMeta;
    for (i=0; i<tabMeta.length && tabMeta[i].key!==""; i++){
      if (i>0){
        myMetaStr=myMetaStr+',';
      }
      myMetaStr=myMetaStr+ '"'+tabMeta[i].key+'":"'+tabMeta[i].value+'"';
    }
    myMetaStr=myMetaStr+'}';
    var persoMeta="";
    if (tabMeta.length>0){
        persoMeta='{"metadata":'+'{'+cacheCtrl+req.params.cacheControl+'",'+theType+req.params.contentType+'",'+myMetaStr+'}' +',"resumable": "false"}';
    } else {
       persoMeta='{"metadata":'+'{'+cacheCtrl+req.params.cacheControl+'",'+theType+req.params.contentType+'"}'+',"resumable": "false"}';
    }
    console.log(JSON.parse(persoMeta))
    const blobStream = blob.createWriteStream(JSON.parse(persoMeta)); 

    blobStream.on("error", (err) => {
      return res.status(505).send({status:505,  msg: err.message });
    });
    blobStream.on("finish", async (data) => {
    const theValue=await cacheFn.cacheFiles(req.params.testProd, req.params.name, req.query.bucket);
    var listFiles=theValue.tab;
    const i = theValue.record;
    if (i<listFiles.length  && listFiles[i].file === req.params.name && listFiles[i].bucket === req.query.bucket) {
        console.log('flag field updated to true for file ' + req.params.name + ' in cache nb' + i);

        cacheFn.fillCacheFileUpdate(i,true);
    }
    return res.status(200).send({status:200, msg: "Uploaded the file successfully: " + req.file.originalname});
    });
    blobStream.end(req.file.buffer);
  } catch (err) {
    return res.send({status:700,msg:'System failure ' + err})
  }
};


const updateMeta = async (req, res) => {
  const cacheCtrl='"cacheControl":"';
  const theType='"contentType":"';
  const theMeta='"metadata":{';
  //const storage = await authFn.getClient(req.params.projectId);
  const storage = new Storage();

  try {
      var bucket = storage.bucket(req.query.bucket);
      bucket.projectId=req.params.projectId;  
      var tabMeta=JSON.parse(req.params.metaPerso);
    
      if (Array.isArray(tabMeta) === false) {
        tabMeta=[];
      }
      /*
      var i = req.params.metaType.indexOf('-');
      const theContentType=req.params.metaType.substring(0,i)+'/'+req.params.metaType.substring(i+1);
      var testData=req.params.metaType;
      testData.replace('-', '/');
      */
      var myMetaStr=theMeta;
      for (i=0; i<tabMeta.length; i++){
        if (i>0){
          myMetaStr=myMetaStr+',';
        }
        myMetaStr=myMetaStr+ '"'+tabMeta[i].key+'":"'+tabMeta[i].value+'"';
      }
      myMetaStr=myMetaStr+'}';
      var persoMeta="";
      if (tabMeta.length>0){
          persoMeta='{'+cacheCtrl+req.params.metaCache+'",'+theType+req.params.metaType+'",'+myMetaStr+'}';
      } else {
        persoMeta='{'+cacheCtrl+req.params.metaCache+'",'+theType+req.params.metaType+'"}';
      }
    
      console.log(persoMeta );
      
      // {"cacheControl":"public,max-age=0,no-cache,no-store","contentType":"application/json","metadata":{"myOwnKwy":"myPerformance"}}
 
      const [metaDataPerso] = await bucket.file(req.params.name).setMetadata(JSON.parse(persoMeta));
      console.log('metadata='+metaDataPerso);
    
      return res.status(200).send({status:200, msg: "MetaData successfully updated ",metaData:metaDataPerso});
  } catch (err) {
    return res.send({status:700,msg:'System failure ' + err});
  }
}

const getListFiles = async (req, res) => {
  try {
    //const storage = await authFn.getClient(req.params.projectId);
    const storage = new Storage();
    var bucket = storage.bucket(req.query.bucket);
    bucket.projectId=req.params.projectId;
    const [files] = await bucket.getFiles();
    let fileInfos = [];
    files.forEach((file) => {
      fileInfos.push({
        name: file.name,
        url: file.metadata.mediaLink,
      });
    });
    return res.status(200).send(fileInfos);
  } catch (err) {
    return res.send({status:700,msg:'System failure ' + err});
  }
};

const getListMetaDataFiles = async (req, res) => {
  try {
    //const storage = await authFn.getClient(req.params.projectId);
    const storage = new Storage();
    var bucket = storage.bucket(req.query.bucket);
    bucket.projectId=req.params.projectId;
    const [files] = await bucket.getFiles();
    let fileInfos = [];
    files.forEach((file) => {
      fileInfos.push({
        items: file.metadata,
      });
    });
    return res.status(200).send(fileInfos);
  } catch (err) {
    console.log(err);
    return res.send({status:700,msg:'System failure ' + err});
  }
};


const getObjectMeta = async (req, res) => {
  try {
    //const storage = await authFn.getClient(req.params.projectId);
    const storage = new Storage();
    var bucket = storage.bucket(req.query.bucket);
    bucket.projectId=req.params.projectId;
    const [metaData] = await bucket.file(req.params.name).getMetadata();
    return res.status(200).send(metaData);
    
  } catch (err) {
    return res.send({status:700,msg:'System failure ' + err});
  }
};

const listBuckets = async (req, res) => {
  try {
    const securityLevel= await securityCtrl.getSecurityAccess(req.params.projectId, req.params.userId,req.params.userPSW);
    if (securityLevel.status!==200){
      return res.send(securityLevel);
    } 

    if (securityLevel.accessLevel!=='High' && securityLevel.accessLevel!=='Very High'){
      return res.send({status:585,msg:"you don't have the right level of security access"});
    }
    //const storage = await authFn.getClient(req.params.projectId);
    const storage = new Storage();
    storage.projectId=req.params.projectId;
    const [buckets] = await storage.getBuckets();
    let BuckInfos = [];
    buckets.forEach(bucket => {
      if (securityLevel.accessLevel==='Very High' || (bucket.name !== bucketCrypto && bucket.name !== bucketLogin))
        BuckInfos.push({name: bucket.name});
    });
    return res.status(200).send(BuckInfos);
  } catch (err) {
    return res.send({status:700,msg:'System failure ' + err});
  }
};

const copyObject = async (req, res) => {
  try {
    const securityLevel= await securityCtrl.getSecurityAccess(req.params.projectId, req.params.userId,req.params.userPSW);
    if (securityLevel.status!==200){
      return res.send(securityLevel);
    } 

    if (securityLevel.accessLevel!=='High' && securityLevel.accessLevel!=='Very High'){
      return res.send({status:585,msg:"you don't have the right level of security access"});
    }
    //const storage = await authFn.getClient(req.params.projectId);
    const storage = new Storage();
    var bucket = storage.bucket(req.query.bucket);
    bucket.projectId=req.params.projectId;
    await bucket.file(req.params.SRCname).copy(storage.bucket(req.params.DESTbucket).file(req.params.DESTname));
    try {
      return res.status(200).send({status:200,msg: "Object is copied as" + req.params.DESTname + ' in bucket ' + req.params.DESTbucket});
    }
    catch (err) {
      return res.send({status:220,msg:'Could not copy object as '  + req.params.DESTname + ' in bucket ' + req.params.DESTbucket + ' error '+ err});
    }
  } catch (err) {
    return res.send({status:700,msg:'System failure ' + err});
  }
};

const moveObject = async (req, res) => {
  try {
    const securityLevel= await securityCtrl.getSecurityAccess(req.params.projectId, req.params.userId,req.params.userPSW);
    if (securityLevel.status!==200){
      return res.send(securityLevel);
    } 

    if (securityLevel.accessLevel!=='High' && securityLevel.accessLevel!=='Very High'){
      return res.send({status:585,msg:"you don't have the right level of security access"});
    }
    var DestBucket=req.params.DESTbucket;
    var DestObject=req.params.DESTname;
    var SRCObject=req.params.SRCname;
    //const storage = await authFn.getClient(req.params.projectId);
    const storage = new Storage();
    const  bucket = storage.bucket(req.query.bucket);
    bucket.projectId=req.params.projectId;
    await bucket.file(req.params.SRCname).move(storage.bucket(req.params.DESTbucket).file(req.params.DESTname));
    try {
      return res.status(200).send({status:200,msg: "Object moved to bucket " + req.params.DESTbucket});
    }
    catch (err) {
      return res.send({status:220,msg:'Could not move object to bucket '  + req.params.DESTbucket + ' error '+ err});
    }
  } catch (err) {
    return res.send({status:700,msg:'System failure ' + err});
  }
};

const renameObject = async (req, res) => {
  try {
    const securityLevel= await securityCtrl.getSecurityAccess(req.params.projectId, req.params.userId,req.params.userPSW);
    if (securityLevel.status!==200){
      return res.send(securityLevel);
    } 

    if (securityLevel.accessLevel!=='High' && securityLevel.accessLevel!=='Very High'){
      return res.send({status:585,msg:"you don't have the right level of security access"});
    }
    //const storage = await authFn.getClient(req.params.projectId);
    const storage = new Storage();
    var bucket = storage.bucket(req.query.bucket);
    bucket.projectId=req.params.projectId;
    await bucket.file(req.params.SRCname).rename(req.params.DESTname);
    try {
      return res.status(200).send({status:200,msg: "Object is renamed "});
    }
    catch (err) {
      return res.send({status:220,msg:'Could not rename the object '  + ' error '+ err});
    }
    
  } catch (err) {
    return res.send({status:700,msg:'System failure ' + err});
  }
};


const deleteObject = async (req, res) => {
  try { 
    const securityLevel= await securityCtrl.getSecurityAccess(req.params.projectId, req.params.userId,req.params.userPSW);
    if (securityLevel.status!==200){
      return res.send(securityLevel);
    } 

    if (securityLevel.accessLevel!=='High' && securityLevel.accessLevel!=='Very High'){
      return res.send({status:585,msg:"you don't have the right level of security access"});
    }
    //const storage = await authFn.getClient(req.params.projectId);
    const storage = new Storage();
    var bucket = storage.bucket(req.query.bucket);
    bucket.projectId=req.params.projectId;
    await bucket.file(req.params.name).delete();
    try {
      return res.status(200).send({msg: "Object is deleted"});
    }
    catch (err) {
      return res.send({status:220,msg:'Could not delete the object '  + ' error '+ err});
    }
  } catch (err) {
    return res.send({status:700,msg:'System failure ' + err});
  }
};


module.exports = {
  upload,
  uploadMetaPerso,
  uploadFromMemory,
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
  checkLogin,
  getMedialinkContent,
  getTextFile,

};