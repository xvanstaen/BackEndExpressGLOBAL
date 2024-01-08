


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
var tabFile = new nodecache;

var cacheConsole= new nodecache;

const authFn = require("./authFn");
const stdFunctions = require("./stdFunctions");
const cryptoFn = require("./cryptoFn");
const configData = require("./tutorial.controller");

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
async function cacheFiles(testProd,fileName,bucketName){
  var listFiles=[];
  var i=0;
  if (tabFile.has(0)){
    listFiles = tabFile.get(0);
  }
  if (tabFile.has(0)===false || (tabFile.has(0) && listFiles.length===0) ){
    const data = await configData.getFilesToCache(testProd);
    if (data.status === 200){
      for (var i=0; i<data.tab.length; i++){
        const classFile= {file:'',bucket:'',updated:true};
        listFiles.push(classFile);
        listFiles[i].file=data.tab[i].object;
        listFiles[i].bucket=data.tab[i].bucket;
      }
      tabFile.set(0, listFiles);
    } else {
      console.log('pb to retrieve filesToCache from configServer; cache listFiles remains empty; env=' + testProd + 
      'data.status=' + data.status);
    }
  } else {
    listFiles = tabFile.get(0);
  }
  for (i=0; i<listFiles.length && (fileName!==listFiles[i].file || bucketName!==listFiles[i].bucket);  i++){}
  return({tab:listFiles,record:i});
}

const getCacheFile = async (req, res) => {
  var myData=await cacheFiles(req.params.testProd,"");
  return res.send({status:200,cacheFiles:myData.tab});
}

const insertCacheFile = async (req, res) => {
  var myData=await cacheFiles(req.params.testProd,"");
  for (var i=0; i<myData.tab.length && myData.tab[i].file!==req.params.name; i++){}
  if (i===myData.tab.length){
    const classFile={file:'',bucket:"",updated:true};
    myData.tab.push(classFile);
    myData.tab[myData.tab.length-1].file=req.params.name;
    myData.tab[myData.tab.length-1].bucket=req.query.bucket;
    tabFile.set(0, myData.tab);
  }
  return res.send({status:200,cacheFiles:myData.tab});
}


const reloadCacheFile = async (req, res) => { // reaccess mongo DB
  if (tabFile.has(0)){
    tabFile.set(0, []);
  }
  var myData=await cacheFiles(req.params.testProd,"");
  return res.send({status:200,cacheFiles:myData.tab});
}

const resetCacheFile = async (req, res) => {
  if (tabFile.has(0)){
    var listFiles=[];
    listFiles = tabFile.get(0);
    if (req.params.fileName==="All"){
      for (i=0; i<listFiles.length; i++){
        listFiles[i].updated=true;
        cache.set(i, []);
        return res.status(200).send({status:200,msg:'cache for all files is reset'});
      }
    } else {
      for (i=0; i<listFiles.length && req.params.fileName!==listFiles[i].file; i++){
        listFiles[i].updated=true;
        cache.set(i, []);
      }
      return res.status(200).send({status:200,msg:'cache for file ' + req.params.fileName + ' is reset'});
    }
  }
  return res.status(201).send({status:201,msg:'cache for file is empty'});
}

const getMedialinkContent = async (req, res) => {
  const storage = await authFn.getClient(req.params.projectId);
  var bucket = storage.bucket(req.query.bucket);
  bucket.projectId=req.params.projectId;
  const [metaData] = await bucket.file(req.params.name).getMetadata();
  console.log("File searched at " + metaData.mediaLink);
  try {
      res.redirect(metaData.mediaLink);
  }
  catch(err){
    console.log("Could not get the file " + metaData.mediaLink + '  error==>' + err);
    res.status(405).send( { message:"Could not get the file " + metaData.mediaLink, error: err } );
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
  const storage = await authFn.getClient(req.params.projectId);
  var bucket = storage.bucket(req.query.bucket);
  bucket.projectId=req.params.projectId;
  
    const [downloadFile] = await bucket.file(req.params.name).download();
    try{

      var myData={text:""};
      myData.text=downloadFile.toString();
      res.status(200).send(myData);
    }
    catch(err){
      console.log("Could not get the file " +req.params.name + '  error==>' + err);
      res.status(404).send( { message:"Could not get the file. ", error: err } );
    }
}

const getFileContent = async (req, res) => {
  try {
    const theValue=await cacheFiles(req.params.testProd, req.params.name, req.query.bucket);
    var listFiles=theValue.tab;
    const i = theValue.record;
    if (i<listFiles.length  && (cache.get(i)) && listFiles[i].updated===false) {
        console.log('retrieve file  ' + req.params.name + ' from cache ' + i);

        fillCacheConsole('retrieve file '+ req.params.name + ' from cache ' + i + " listFiles=","listFiles");
        
        res.status(200).send(cache.get(i));
    } else {
      const storage = await authFn.getClient(req.params.projectId);
      var bucket = storage.bucket(req.query.bucket);
      bucket.projectId=req.params.projectId;
  
      /**
      const [metaData] = await bucket.file(req.params.name).getMetadata();
      console.log("File found & link is " + metaData.mediaLink);
      res.redirect(metaData.mediaLink);
       */
      console.log('retrieve file '+ req.params.name);
      fillCacheConsole('retrieve file '+ req.params.name ,tabFile.get(0));
      const [downloadFile] = await bucket.file(req.params.name).download();
      try{
        if (i<listFiles.length){
          listFiles = tabFile.get(0); 
          listFiles[i].updated=false; 
          tabFile.set(0, listFiles);
          cache.set(i,JSON.parse(downloadFile));
          console.log('retrieved file  ' + req.params.name + ' & update of cache ' + i);
        }
        try{
          const theJson=JSON.parse(downloadFile)
          res.status(200).send(theJson);
        } 
        catch(err){
          var myData={text:""};
          myData.text=downloadFile.toString();
          res.status(200).send(myData);
        }
      }
      catch(err){
          fillCacheConsole('Could not get the file '+ req.params.name );
          console.log("Could not get the file " +req.params.name + '  error==>' + err);
          res.status(504).send( { message:"Could not get the file. ", error: err } );
        }
    }

  }
  catch (err) {
    
    console.log("Could not get the file " +req.params.name + '  error==>' + err);
    res.status(404).send( { message:"Could not get the file. ", error: err } );
  }
};

var bucketLogin='manage-login';

async function getUserPswRecord(projectId, userId){
  const storage = await authFn.getClient(projectId);
  var bucket = storage.bucket(bucketLogin);
  bucket.projectId=projectId;

  const [downloadFile] = await bucket.file(userId+'PSW.json').download();

  const decrypt = await cryptoFn.getDecrypt(JSON.parse(downloadFile).psw , JSON.parse(downloadFile).key, JSON.parse(downloadFile).method ,0, projectId)
  return ({data:decrypt, bucketUserInfo:JSON.parse(downloadFile).bucketUserInfo});
}


const  checkLogin = async (req, res) => {
  try {
    const myDecrypt = await getUserPswRecord(req.params.projectId,req.params.userId );
    
    if (myDecrypt.data === "Key invalid" || myDecrypt.data !== req.params.psw){
      res.status(700).send({error:"invalid request"});
    } else {
      const storage = await authFn.getClient(req.params.projectId);
      var bucket = storage.bucket(myDecrypt.bucketUserInfo);
      bucket.projectId=req.params.projectId;
      const [downloadFile] = await bucket.file(req.params.userId+'.json').download();
      res.status(200).send(JSON.parse(downloadFile));
    }
  }
  catch (err) {
    console.log("CHECK LOGIN - could not get the file. " + err);
    res.status(404).send( { message:"Could not get the file. ", error: err } );
  }
}


const upload =async (req, res) => {
  try {
    //console.log(' ===> upload');
    const storage = await authFn.getClient(req.params.projectId);
   
    var bucket = storage.bucket(req.query.bucket);
    bucket.projectId=req.params.projectId;
    enableUniformBucketLevelAccess(req.query.bucket, storage);
    
    await processFile(req, res);
    if (!req.file) {
      return res.status(400).send({ message: "Please upload a file!" });
    }

    // Create a new blob in the bucket and upload the file data. req.params.name
    const blob = bucket.file(req.file.originalname);

    if (req.params.contentType==='json') {
      var theType='application/json';
    } else if (req.params.contentType==='text') {
      var theType='text/plain';
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


        const theValue=await cacheFiles(req.params.testProd, req.params.name,req.query.bucket);
        var listFiles=theValue.tab;
        const i = theValue.record;
        if (i<listFiles.length  && listFiles[i].file === req.params.name && listFiles[i].bucket === req.query.bucket) {
            console.log('flag field updated to true for file ' + req.params.name + ' in cache nb' + i);
            listFiles[i].updated=true;
            tabFile.set(0, listFiles);
        }
        res.status(200).send({
          message: "Uploaded the file successfully: " + req.file.originalname
        });
    });
    blobStream.end(req.file.buffer);
  } catch (err) {
    res.status(515).send({message: `Could not upload the file: ${req.file.originalname}. ${err}` });
  }
};

const getCacheConsole=async (req, res) => {
  if (cacheConsole.has(0)){
    const theTab=cacheConsole.get(0);
    return res.send({msg:theTab,status:0});
  } else {
    return res.send({msg:"nothing found in cacheConsole",status:0})
  }
}

const resetCacheConsole=async (req, res) => {
  var theTab=[];
  cacheConsole.set(0, theTab);
  return res.send({msg:"cacheConsole is reset",status:0})
}

function fillCacheConsole(theMsg, content){
 
  var theTab=[];
  if (cacheConsole.has(0)){
      const tabRecord={theDate:"", msg:"", content:""}
      theTab = cacheConsole.get(0);
      theTab.push(tabRecord);
      theTab[theTab.length-1].theDate=stdFunctions.defineMyDate();
      theTab[theTab.length-1].content=content;
      theTab[theTab.length-1].msg=theMsg;
  } else {
      const tabRecord={theDate:"", msg:"", content:""}
      theTab.push(tabRecord);
      theTab[0].theDate=stdFunctions.defineMyDate();
      theTab[0].msg=theMsg;
      theTab[0].content=content;
  }
  cacheConsole.set(0, theTab);
}

const uploadMetaPerso =async (req, res) => {
  try {

    fillCacheConsole('in uploadMetaPerso',"");

    const storage = await authFn.getClient(req.params.projectId);
   
    var bucket = storage.bucket(req.query.bucket);
    bucket.projectId=req.params.projectId;
    enableUniformBucketLevelAccess(req.query.bucket, storage);
    
    await processFile(req, res);
    if (!req.file) {
      return res.status(400).send({ message: "Please upload a file!" });
    }

    // Create a new blob in the bucket and upload the file data. req.params.name
    const blob = bucket.file(req.file.originalname);
    var theContentType="";
    if (req.params.contentType==='json' || req.params.contentType==='application') {
      theContentType='application/json';
    } else if (req.params.contentType==='text' || req.params.contentType==='plain') {
      theContentType='text/plain';
    }

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
        persoMeta='{"metadata":'+'{'+cacheCtrl+req.params.cacheControl+'",'+theType+theContentType+'",'+myMetaStr+'}' +',"resumable": "false"}';
    } else {
       persoMeta='{"metadata":'+'{'+cacheCtrl+req.params.cacheControl+'",'+theType+theContentType+'"}'+',"resumable": "false"}';
    }
    console.log(JSON.parse(persoMeta))
    const blobStream = blob.createWriteStream(JSON.parse(persoMeta)); 

    blobStream.on("error", (err) => {
      res.status(505).send({ message: err.message });
    });
    blobStream.on("finish", async (data) => {
    const theValue=await cacheFiles(req.params.testProd, req.params.name, req.query.bucket);
    var listFiles=theValue.tab;
    const i = theValue.record;
    if (i<listFiles.length  && listFiles[i].file === req.params.name && listFiles[i].bucket === req.query.bucket) {
        console.log('flag field updated to true for file ' + req.params.name + ' in cache nb' + i);
        listFiles[i].updated=true;
        tabFile.set(0, listFiles);
    }
    res.status(200).send({
          message: "Uploaded the file successfully: " + req.file.originalname
        });
    });
    blobStream.end(req.file.buffer);
  } catch (err) {
    res.status(517).send({message: `Could not upload the file: ${req.file.originalname}. ${err}` });
  }
};


const updateMeta = async (req, res) => {
  const storage = await authFn.getClient(req.params.projectId);
  var bucket = storage.bucket(req.query.bucket);
  bucket.projectId=req.params.projectId;
 /**
  const persoMetadata = {
    cacheControl: 'public,max-age=0,no-cache,no-store',
    contentType: 'application/json',
    metadata:{
      keyOne:'valueOne',
      keyTwo:'valueTwo',
    }
  };
  */
  
  var tabMeta=JSON.parse(req.params.metaPerso);
 
  if (Array.isArray(tabMeta) === false) {
    tabMeta=[];
  }
  
  var i = req.params.metaType.indexOf('-');
  const theContentType=req.params.metaType.substring(0,i)+'/'+req.params.metaType.substring(i+1);
  var testData=req.params.metaType;
  testData.replace('-', '/');

  const cacheCtrl='"cacheControl":"';
  const theType='"contentType":"';
  const theMeta='"metadata":{';
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
      persoMeta='{'+cacheCtrl+req.params.metaCache+'",'+theType+theContentType+'",'+myMetaStr+'}';
  } else {
     persoMeta='{'+cacheCtrl+req.params.metaCache+'",'+theType+theContentType+'"}';
  }
 
  console.log(persoMeta );
  
  // {"cacheControl":"public,max-age=0,no-cache,no-store","contentType":"application/json","metadata":{"myOwnKwy":"myPerformance"}}
  try {
        const [metaDataPerso] = await bucket.file(req.params.name).setMetadata(JSON.parse(persoMeta));
        console.log('metadata='+metaDataPerso);
    
        res.status(200).send({message: "MetaData successfully updated ",metaData:metaDataPerso});
  } catch (err) {
    res.status(500).send({ message: "MetaData not updated - returned error is " + err });
  }
}

const getListFiles = async (req, res) => {
  try {
    const storage = await authFn.getClient(req.params.projectId);
   
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
    res.status(200).send(fileInfos);
  } catch (err) {
    res.status(500).send({ message: "Unable to read list of files!" });
  }
};

const getListMetaDataFiles = async (req, res) => {
  try {
    const storage = await authFn.getClient(req.params.projectId);
   
    var bucket = storage.bucket(req.query.bucket);
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


const getObjectMeta = async (req, res) => {
  try {
    const storage = await authFn.getClient(req.params.projectId);
    var bucket = storage.bucket(req.query.bucket);
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
    const storage = await authFn.getClient(req.params.projectId);
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
    const storage = await authFn.getClient(req.params.projectId);
    var bucket = storage.bucket(req.query.bucket);
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
    const storage = await authFn.getClient(req.params.projectId);
    const  bucket = storage.bucket(req.query.bucket);
    bucket.projectId=req.params.projectId;
    await bucket.file(req.params.SRCname)
    .move(storage.bucket(req.params.DESTbucket).file(req.params.DESTname));
    res.status(200).send({message: "Object moved to bucket " + req.params.DESTbucket});
  } catch (err) {
    res.status(502).send({
      message: "Could not move the object to bucket " + req.params.DESTbucket + 
      'Parameters: DESTbucket=' + DestBucket + 
      ' SRCobject=' + SRCObject  + ' Destobject=' + DestObject + ' error=' + err});
  }
};

const renameObject = async (req, res) => {
  try {
    const storage = await authFn.getClient(req.params.projectId);
    var bucket = storage.bucket(req.query.bucket);
    bucket.projectId=req.params.projectId;
    await bucket.file(req.params.SRCname)
    .rename(req.params.DESTname);
    res.status(200).send({
      message: "Object is renamed "
    });
  } catch (err) {
    res.status(500).send({ message: "Could not rename the object " + err});
  }
};



const deleteObject = async (req, res) => {
  try {
    const storage = await authFn.getClient(req.params.projectId);
    var bucket = storage.bucket(req.query.bucket);
    bucket.projectId=req.params.projectId;
    await bucket.file(req.params.name).delete();
    res.status(200).send({message: "Object is deleted"});
  } catch (err) {
    res.status(500).send({message: "Could not delete the object " + err});
  }
};




module.exports = {
  upload,
  uploadMetaPerso,
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
  getUserPswRecord,
  resetCacheFile,
  getCacheFile,
  reloadCacheFile,
  getMedialinkContent,
  getTextFile,
  insertCacheFile,
  getCacheConsole,
  fillCacheConsole,
  resetCacheConsole

  
};