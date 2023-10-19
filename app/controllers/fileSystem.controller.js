

const { MAX_RETRY_DEFAULT } = require("@google-cloud/storage/build/src/storage");
const { Storage } = require("@google-cloud/storage");

const fileController = require("./file.controller");
const stdFunctions = require("./stdFunctions");
const authFn = require("./authFn");

const { stringify } = require("querystring");
const {google} = require('googleapis');
const http = require('http');
const https = require('https');
const url = require('url');

const nodecache = require('node-cache');
var credentialCache = new nodecache;
var fileSystemCache = new nodecache;
//var credentials='';
var lockFileSystem=[];


const onFileSystem = async (req, res) => {
  var credentials='';
  var myFileSystem=[];
  try {
    var tabLock=JSON.parse(req.params.tabLock);

    if ( credentialCache.has(0)){
        credentials=credentialCache.get(0);
    } else {
      const theValue = await authFn.getDefaultCredentials(req.params.projectId);
      if (theValue.status === 200){
        credentialCache.set(0,theValue.credentials);
        credentials=theValue.credentials;
      } 
    }
    if (credentials.userServerId===undefined || tabLock[0].credentialDate !== credentials.creationDate){
      myFileSystem = await getFileSystem(req.query.bucket, req.params.projectId, tabLock[req.params.iWait].objectName);
      for (var i=0; i< myFileSystem.length && ( myFileSystem[i].object!==tabLock[req.params.iWait].object ||  myFileSystem[i].bucket!==tabLock[req.params.iWait].bucket); i++){}
      if (i< myFileSystem.length && myFileSystem[i].createdAt === tabLock[req.params.iWait].createdAt && 
          myFileSystem[i].updatedAt === tabLock[req.params.iWait].updatedAt &&
          myFileSystem[i].userServerId === tabLock[req.params.iWait].userServerId && 
          myFileSystem[i].credentialDate === tabLock[req.params.iWait].credentialDate  ){
          tabLock[req.params.iWait].credentialDate=credentials.creationDate;
          tabLock[req.params.iWait].userServerId=credentials.userServerId;

          // last update was performed by same user
          myFileSystem.splice(i,0);
          const code = await saveFS(req.params.projectId, req.query.bucket,tabLock[req.params.iWait].objectName,JSON.stringify(myFileSystem),tabLock[req.params.iWait]);
          console.log('server was reset and same user re-accesses the file');
          }
        else if (i< myFileSystem.length && myFileSystem[i].credentialDate === credentials.creationDate) {
          const theMsg='server was reset and file is locked by another user';
          console.log(theMsg);
          return res.send({msg: theMsg, status:956});   
        } else {
          const theMsg=' credentials.userServerId = ' + credentials.userServerId + '|| tabLock[0].credentialDate ('+tabLock[0].credentialDate+ ')< credentials.creationDate (' + credentials.creationDate + ');  server has been reinitialized ; restart your apps' 
          console.log(theMsg);
          return res.send({msg: theMsg, status:955});       
        }
      }

      
      console.log('===> in updateFileSystem() for user ' + JSON.stringify(tabLock[req.params.iWait]) );
      console.log('lockFileSystem='+JSON.stringify(lockFileSystem));
      if (tabLock[0].action!=='onDestroy'){
        const inUse=inUseFileSystem(tabLock[req.params.iWait]);
        if (inUse.code!==0 ){
          console.log('retry later, status error=' + inUse.code);
          return res.send({msg: 'retry later', status:inUse.code});
        }
      }

      var theStatus = [];
         
        //console.log('theFileParse=',theFileParse);
      var tabInUse=[];
      if (tabLock[req.params.iWait].action==='onDestroy'  ){
        for (var iWait=0; iWait<tabLock.length; iWait++){
          
          if (tabLock[iWait].lock===1){
            tabLock[iWait].action='onDestroy';
            const inUse = inUseFileSystem(tabLock[iWait]);
            tabInUse[iWait]=inUse.code;
          } else {
            tabInUse[iWait]=1;
          }
        }
        for (var iWait=0; iWait<tabLock.length; iWait++){
              
          if (tabLock[iWait].lock===1 ){
              console.log('onDestroy - userServerId ' + tabLock[iWait].userServerId + ' bucket=' + tabLock[iWait].bucket + '  object=' + tabLock[iWait].object + ' file system=' + tabLock[iWait].objectName);
              tabLock[iWait].action='unlock';              
              var trouve = false;
              var tabFS=[];
              var record=0;
              if (fileSystemCache.has(0)){
                  tabFS = fileSystemCache.get(0);
                  for (record=0; record<tabFS.length && tabFS[record].fileName!==tabLock[iWait].objectName; record++){}
                  if (record<tabFS.length) {
                    myFileSystem = tabFS[record].content;
                    trouve = true;
                  } 
              } 
              if (trouve === false)
              {
                myFileSystem = await getFileSystem(req.query.bucket, req.params.projectId, tabLock[iWait].objectName);
                const recordFS={fileName:"", content:""}
                tabFS.push(recordFS);
                tabFS[tabFS.length-1].fileName=tabLock[iWait].objectName;
                tabFS[tabFS.length-1].content=myFileSystem;
                record=tabFS.length-1;
                fileSystemCache.set(0,tabFS);
              }

              theStatus = checkData(myFileSystem, iWait, tabLock, credentials.creationDate);

              tabLock[iWait].action='onDestroy';
              if (theStatus.theFile !== undefined){

                const code = await saveFS(req.params.projectId, req.query.bucket,tabLock[iWait].objectName,JSON.stringify(theStatus.theFile),tabLock[iWait]);
                tabFS[record].content=myFileSystem;
                fileSystemCache.set(0,tabFS);
                if (tabInUse[iWait]===0){
                  resetInUseFileSystem(tabLock[iWait]);
                  tabInUse[iWait]===1;
                }
                if (code===200){
                  console.log('status = 200' + tabLock[req.params.iWait].action + " is completed for user " + tabLock[req.params.iWait].userServerId);
                  //return res.send({tabLock:tabLock, message: tabLock[req.params.iWait].action + " is completed for user " + tabLock[req.params.iWait].userServerId, status:200});
                } else if (code===201){
                  console.log('status = 201' + tabLock[req.params.iWait].action + " is completed without metadata for user " + tabLock[req.params.iWait].userServerId);
                  //return res.send({tabLock:tabLock, message: tabLock[req.params.iWait].action + " is completed without metadata for user " + tabLock[req.params.iWait].userServerId, status:200});
                } else {
                  console.log('status = 997' + "after save is a failure for user " + tabLock[req.params.iWait].userServerId +  ' on action ' + tabLock[req.params.iWait].action);
                  // return res.send({message:"after save is a failure for user " + tabLock[req.params.iWait].userServerId +  ' on action ' + tabLock[req.params.iWait].action, status:997});
                }
                

              } else {
                // no destroy because record didn't belong to this user
                // release the unlock
                console.log('cannot destroy record of ' + tabLock[iWait].objectName + ' userServerId ' +  tabLock[iWait].userServerId +   ' because locked by another user')
                if (tabInUse[iWait]===0){
                  resetInUseFileSystem(tabLock[iWait]);
                  tabInUse[iWait]===1;
                }

              }

          }
        }

        console.log('on Destroy is completed for userServerId ' +  tabLock[0].userServerId)
        return res.send({message:"on Destroy is completed", status:999});
      } else if (tabLock[req.params.iWait].action==='lock'|| tabLock[req.params.iWait].action==='unlock' ||
            tabLock[req.params.iWait].action==='check' || tabLock[req.params.iWait].action==='check&update'
            || tabLock[req.params.iWait].action==='updatedAt' ) {


          var myFileSystem=[];
          var trouve = false;
          var tabFS=[];
          var record=0;
          if (fileSystemCache.has(0)){
              tabFS = fileSystemCache.get(0);
              for (record=0; record<tabFS.length && tabFS[record].fileName!==tabLock[req.params.iWait].objectName; record++){}
                  if (record<tabFS.length) {
                    myFileSystem = tabFS[record].content;
                    trouve = true;
                  } 
            } 
            if (trouve === false)
            {
              myFileSystem = await getFileSystem(req.query.bucket, req.params.projectId, tabLock[req.params.iWait].objectName)
              const recordFS={fileName:"", content:""}
              tabFS.push(recordFS);
              tabFS[tabFS.length-1].fileName=tabLock[req.params.iWait].objectName;
              tabFS[tabFS.length-1].content=myFileSystem;
              record=tabFS.length-1;
              fileSystemCache.set(0,tabFS);
            }
          // const [fileData] = await bucketFileSystem.file(tabLock[req.params.iWait].objectName).download();
          // const myFileSystem = await getFileSystem(req.query.bucket, req.params.projectId, tabLock[req.params.iWait].objectName)
                    
          theStatus =checkData(myFileSystem, req.params.iWait, tabLock, credentials.creationDate);

          if (theStatus.theFile !== undefined){
             
              if (theStatus.record !== undefined && tabLock[req.params.iWait].action==='lock' || tabLock[req.params.iWait].action==='check&update' || tabLock[req.params.iWait].action==='updatedAt'){
                  tabLock[req.params.iWait].lock=1;
                  tabLock[req.params.iWait].createdAt=theStatus.theFile[theStatus.record].createdAt;
                  tabLock[req.params.iWait].updatedAt=theStatus.theFile[theStatus.record].updatedAt;
              } else  if (tabLock[req.params.iWait].action==='unlock'){
                  tabLock[req.params.iWait].lock=3;
              };
              const code = await saveFS(req.params.projectId, req.query.bucket,tabLock[req.params.iWait].objectName,JSON.stringify(theStatus.theFile),tabLock[req.params.iWait]);
              tabFS[record].content=myFileSystem;
                fileSystemCache.set(0,tabFS);
                if (tabInUse[req.params.iWait]===0){
                  resetInUseFileSystem(tabLock[req.params.iWait]);
                  tabInUse[req.params.iWait]===1;
                }
              if (code===200){
                return res.send({tabLock:tabLock, message: tabLock[req.params.iWait].action + " is completed for user " + tabLock[req.params.iWait].userServerId, status:200});
              } else if (code===201){
                return res.send({tabLock:tabLock, message: tabLock[req.params.iWait].action + " is completed without metadata for user " + tabLock[req.params.iWait].userServerId, status:200});
              } else {
                return res.send({message:"after save is a failure for user " + tabLock[req.params.iWait].userServerId +  ' on action ' + tabLock[req.params.iWait].action, status:997});
              }

        } else { // error code is returned
          resetInUseFileSystem(tabLock[req.params.iWait]);
          console.log("Code " + theStatus + '  returned for action = ' + tabLock[req.params.iWait].action + " for user " + tabLock[req.params.iWait].userServerId)
          return res.send({message:"Code " + theStatus + '  returned for action = ' + tabLock[req.params.iWait].action + " for user " + tabLock[req.params.iWait].userServerId , status:theStatus});
        }

      } else {
          resetInUseFileSystem(tabLock[req.params.iWait]);
          return res.send({message:"wrong action for user " + tabLock[req.params.iWait].userServerId, status:998});
      }
    }
  catch (err) {
    const tabLock=JSON.parse(req.params.tabLock);
    if (tabLock[0].action==='onDestroy'){
      for (var iWait=0; iWait<tabLock.length; iWait++){
        if (tabLock[iWait].lock===1){
          tabLock[iWait].action='onDestroy';
          resetInUseFileSystem(tabLock[iWait]);
        } 
      }
    }
        console.log('global failure for user ' + tabLock[req.params.iWait].userServerId + '  error==>' + err);
        resetInUseFileSystem(tabLock[req.params.iWait]);
        return res.send({message:"global failure for user " + tabLock[req.params.iWait].userServerId, status:999}); 
  /*  } */
  } 
};

const getMemoryFS= async (req, res) => {
  var tabFS=[];
  if (fileSystemCache.has(0)){
    tabFS = fileSystemCache.get(0);
  } 
  return res.send({status:0, data:tabFS})
}

const resetFS= async (req, res) => {

  // *** how to manage several records within one file system? Can it happen?
  var tabLock=JSON.parse(req.params.tabLock);
  var myFileSystem=[];
  var tabFS=[];
  var newTabFS=[];
  var record=0;
  // const inUse=inUseFileSystem(tabLock[req.params.iWait]);
  if (fileSystemCache.has(0)){
    tabFS = fileSystemCache.get(0);
    for (record=0; record<tabFS.length && tabFS[record].fileName!==tabLock[req.params.iWait].objectName; record++){}
    if (record<tabFS.length) {
        tabFS[record].content=[];
        var j=-1;
        for (var i=0; i<tabFS.length; i++){
          if (i!==record){
            j++
            newTabFS[j]=tabFS[i];
          }
        }
        fileSystemCache.set(0,newTabFS);
      } 
    } 
  if (tabLock[req.params.iWait].action==="resetAll"){
      fileSystemCache.set(0,newTabFS);
      const code = await saveFS(req.params.projectId, req.query.bucket,tabLock[req.params.iWait].objectName,JSON.stringify(myFileSystem),tabLock[req.params.iWait]);
      if (code===200){
            return res.status(200).send({status:200, message:'file system ' + req.params.name + ' has been reset and file saved with metadata'});
        } else if (code===201){
            return res.status(201).send({status:201,message:'file system ' + req.params.name + ' has been resetand file is saved but metaData not updated'});
        } else {
            return res.status(202).send({status:202,message:'file system memory has been reset but file could not be saved'});
        }
  }

       // myFileSystem = tabFS[record].content
      myFileSystem = await getFileSystem(req.query.bucket, req.params.projectId, tabLock[req.params.iWait].objectName);
      for (record=0; record<myFileSystem.length && myFileSystem[record].object!==tabLock[req.params.iWait].object; record++){}
      if (record<myFileSystem.length) {
          myFileSystem.splice(record,1);
          const code = await saveFS(req.params.projectId, req.query.bucket,tabLock[req.params.iWait].objectName,JSON.stringify(myFileSystem),tabLock[req.params.iWait]);
          if (code===200){
            return res.status(200).send({status:200,message:'file system ' + req.params.name + ' has been reset for ' + tabLock[req.params.iWait].object + ' , file saved with metadata'});
          } else if (code===201){
            return res.status(201).send({status:201,message:'file system ' + req.params.name + ' has been resetfor ' + tabLock[req.params.iWait].object + ', file saved but metaData not updated'});
          } else {
            return res.status(202).send({message:'file system memory has been reset but file ' + req.params.name + ' could not be saved'});
          }
        }
      else {
        return res.status(203).send({status:203,message:'file system memory' + req.params.name + ' has been reset but record '+ tabLock[req.params.iWait].object + ' in file ' + req.params.name + ' was not found'});
          } 

}

function inUseFileSystem(tablockItem){

  const recordFS={
    action:"", objectName:"", createdAt:"", updatedAt:"", access:0, userServerId:0, dateTime:""
  }
  for (var i=0; i<lockFileSystem.length && lockFileSystem[i].objectName!==tablockItem.objectName; i++){ }
  if (i===lockFileSystem.length){
    lockFileSystem.push(recordFS);
    lockFileSystem[lockFileSystem.length-1].objectName = tablockItem.objectName;
    lockFileSystem[lockFileSystem.length-1].action = tablockItem.action;
    lockFileSystem[lockFileSystem.length-1].createdAt = tablockItem.createdAt;
    lockFileSystem[lockFileSystem.length-1].updatedAt = tablockItem.updatedAt;
    lockFileSystem[lockFileSystem.length-1].userServerId = tablockItem.userServerId;
    lockFileSystem[lockFileSystem.length-1].access=0;
    lockFileSystem[lockFileSystem.length-1].dateTime=stdFunctions.defineMyDate();
    
    return({code:0});
  } else {
    console.log('action on' + tablockItem.objectName + '  userServerId=' + tablockItem.userServerId + '  already requested by another resource');
    const refDate = stdFunctions.fnAddTime(lockFileSystem[i].dateTime, 0, 2); // 0h2mn
    const currentDateTime=stdFunctions.defineMyDate();
    if (currentDateTime > refDate){
      // the lock was for too long; previous error not detected; 
      console.log(' lockFile record is updated because was there for more than 2 minutes'); 
      lockFileSystem[i].objectName = tablockItem.objectName;
      lockFileSystem[i].action = tablockItem.action;
      lockFileSystem[i].createdAt = tablockItem.createdAt;
      lockFileSystem[i].updatedAt = tablockItem.updatedAt;
      lockFileSystem[i].userServerId = tablockItem.userServerId;
      lockFileSystem[i].access=0;
      lockFileSystem[i].dateTime=currentDateTime;
      return({code:0});
    } 
    
    if (tablockItem.action === 'onDestroy'){
      lockFileSystem[i].access++
      return({code:0});
    }
    return({code:666,action:lockFileSystem[i]});
  }
}

function resetInUseFileSystem(tablockItem){

  for (var i=0; i<lockFileSystem.length && lockFileSystem[i].objectName!==tablockItem.objectName; i++){ }
  if (i<lockFileSystem.length){
    if (tablockItem.action === 'onDestroy' && lockFileSystem[i].access>0){
      lockFileSystem[i].access--
    } else {
      lockFileSystem.splice(i,1);
    }
  } else {
    console.log('resetInUseFileSystem - record ' + tablockItem.objectName  + '  userServerId=' + tablockItem.userServerId +  ' not found - CHECK THE CODE --- lockFileSystem.length=' + lockFileSystem.length);

  }
  return(0);
}




async function saveFS(projectId, bucket,object,fileContent,tablockItem){
  const storage = await authFn.getClient(projectId);
  var bucketFileSystem = storage.bucket(bucket);
  bucketFileSystem.projectId=projectId;
  bucketFileSystem.id=bucket;
  bucketFileSystem.name=bucket;
  await bucketFileSystem.file(object).save(fileContent);
  try{
    const storage = await authFn.getClient(projectId);
    var bucketMetaFS = storage.bucket(bucket);
    bucketMetaFS.projectId=projectId;
    bucketMetaFS.id=bucket;
    bucketMetaFS.name=bucket;
    const newMetadata = {
      cacheControl: 'public,max-age=0,no-cache,no-store',
      contentType: 'application/json'
    };
      await bucketMetaFS.file(object).setMetadata(newMetadata);
      try{
        if (tablockItem.action!=='onDestroy'){
          resetInUseFileSystem(tablockItem);
          console.log(tablockItem.action + " is completed for user " + tablockItem.userServerId)
          //return res.send({tabLock:tabLock, message: tablockItem.action + " is completed for user " + tablockItem.userServerId, status:200});
        } 
        return(200);

        
      }
      catch (err) {
        if (tablockItem.action!=='onDestroy'){
          console.log(tablockItem.action + " is completed without metadata for user " + tablockItem.userServerId + " error==>" + err);
          resetInUseFileSystem(tablockItem);
          //return res.send({tabLock:tabLock, message: tablockItem.action + " is completed without metadata for user " + tablockItem.userServerId, status:200});
        } 
        return(201);

      }
      
    }
  catch (err) {
    if (tablockItem.action!=='onDestroy'){
        console.log('after save is a failure for user ' + tablockItem.userServerId + '  error= ' + err);
        resetInUseFileSystem(tablockItem);
        //return res.send({message:"after save is a failure for user " + tablockItem.userServerId +  ' on action ' + tablockItem.action, status:997});
      } 
      console.log('saveFS ==> error detected - 997');
      return(997);
     
    }
}

async function getFileSystem(theBucket, projectId, fileName){
  try{
    /*
    const storage = new Storage();
    const bucketFileSystem = storage.bucket(theBucket);
    bucketFileSystem.projectId=projectId;
    bucketFileSystem.id=theBucket;
    bucketFileSystem.name=theBucket;
    */

    const storage = await authFn.getClient(projectId);
    var bucket = storage.bucket(theBucket);
    bucket.projectId=projectId;
    const [fileData] = await bucket.file(fileName).download();
    return (JSON.parse(fileData));
  }
  catch (err)
  {
    return([]);
  }  
}

function checkData(fileSystem, iWait, tabLock, credentialDate){
  //console.log('start checkData');
  if (fileSystem.length > 0 ){
    for (var i=0; i<fileSystem.length && (fileSystem[i].object!==tabLock[iWait].object || fileSystem[i].bucket!==tabLock[iWait].bucket); i++){}
    if (i<fileSystem.length && fileSystem[i].credentialDate!==credentialDate){ // server was reinitiated
      
      fileSystem.splice(i,1); // delete the record and create a new one
      const createFS = stdFunctions.createRecord(fileSystem,tabLock[iWait]);
      return({theFile:createFS, record:createFS.length-1});
    }
    if (tabLock[iWait].action==="lock"){
        if (i===fileSystem. length ){
            // record not found so create a new record and flag lock to true
            const createFS = stdFunctions.createRecord(fileSystem,tabLock[iWait]);
            return({theFile:createFS, record:createFS.length-1});
        } else { // record already exists ; check if already locked and by whom
            
            console.log('tabLock[iWait]='+JSON.stringify(tabLock[iWait]));
            
             if (fileSystem[i].createdAt === tabLock[iWait].createdAt && 
              fileSystem[i].updatedAt === tabLock[iWait].updatedAt &&
              fileSystem[i].userServerId === tabLock[iWait].userServerId // file is already locked by same user
              ){
                const updatedFS=stdFunctions.updatedAt(fileSystem,iWait,i);
                return({theFile:updatedFS, record:i});
              } else {
                console.log('record in file system ' + JSON.stringify(fileSystem[i]) + ' already exists and is locked - Error 300; run validateLock()');
                const validate=stdFunctions.validateLock(fileSystem,tabLock[iWait],i);
                if (typeof validate === 'object') {
                  console.log('record is unlocked by validateLock')
                  return({theFile:validate, record:i});
                } else {return(validate)};
              }
            
            
        }
    } else if (tabLock[iWait].action==="unlock"){
        if (i===fileSystem.length ){
            // record is not found so cannot be unlocked
            console.log('record not found, so cannot be unlocked - Error 700');
            return(700);
        } else { // record is found; delete it
          if (tabLock[iWait].createdAt === fileSystem[i].createdAt) {
            console.log("unlock tabLock[iWait].createdAt" + tabLock[iWait].createdAt + '  fileSystem[i].createdAt ' + fileSystem[i].createdAt);
            fileSystem.splice(i,1);
            return({theFile:fileSystem});
          } else {
            console.log('record found but createdAt is different ,  so cannot be unlocked - Error 710');
            return(710);
          }
        }
    } else if (tabLock[iWait].action==="updatedAt"){
      if (tabLock[iWait].createdAt === fileSystem[i].createdAt) {
        const updatedFS=stdFunctions.updatedAt(fileSystem,iWait,i);
        return({theFile:updatedFS, record:i});
            
      } else {
        console.log('record found but createdAt is different ,  so cannot be updated - Error 720');
            return(720);
      }
    } else if (tabLock[iWait].action==="check" || tabLock[iWait].action==="check&update"){
      if (i===fileSystem.length ){ // no record found
          if (tabLock[iWait].action==="check"){
            console.log('check file = no record found on file ' +tabLock[iWait].objectName + '; return inData.status 800');
            tabLock[iWait].createdAt='';
            tabLock[iWait].updatedAt='';
            tabLock[iWait].status=800;
          } else {
            const createFS = stdFunctions.createRecord(fileSystem,tabLock[iWait]);
            return({theFile:createFS, record:createFS.length-1});
          }
          
      } else {
        if (tabLock[iWait].createdAt === fileSystem[i].createdAt && tabLock[iWait].userServerId === fileSystem[i].userServerId){
          if (tabLock[iWait].action==="check"){  
            tabLock[iWait].status=810; 
                console.log('check file = record found and locked by same user; return inData.status 810');
            // same user is locking the file
          } else {
            const updatedFS=stdFunctions.updatedAt(fileSystem,iWait,i);
            return({theFile:updatedFS, record:i});
          }
        } else { 
            tabLock[iWait].status=820; 
            console.log('check file = record found and locked by another user; return inData.status 820');
            console.log('file system record is :', JSON.stringify(fileSystem));
            console.log('tablock ['+iWait+"] is :", JSON.stringify(tabLock[iWait]));
            console.log('----------------------------------------------');
          }
      } 
      return({tabLockItem:tabLock[iWait]});
    } else {
      console.log('wrong inData.action ==> return err-730');
      return(730);} // wrong action
  } else { // file system is empty
    if (tabLock[iWait].action==="lock"){
        console.log('fileSystem' +tabLock[iWait].objectName + ' is empty; createRecord');
        const createFS = stdFunctions.createRecord(fileSystem,tabLock[iWait]);
        return({theFile:createFS, record:createFS.length-1});
    } else if (tabLock[iWait].action==="check"  || tabLock[iWait].action==="check&update"){
        if (tabLock[iWait].action==="check"){
          console.log('check file = fileSystem ' +tabLock[iWait].objectName + 'is empty; return inData.status 800');
          tabLock[iWait].createdAt='';
          tabLock[iWait].updatedAt='';
          tabLock[iWait].status=800;
          return({tabLockItem:tabLock[iWait]});
        } else {
          const createFS = stdFunctions.createRecord(fileSystem,tabLock[iWait]);
          //console.log('create record & tabLock = ' + JSON.stringify(tabLock[iWait]) );
          return({theFile:createFS, record:createFS.length-1});
        }
    } else {
      console.log('fileSystem ' + tabLock[iWait].objectName + 'is empty; no action taken on ' + tabLock[iWait].action);
      return('err-0'); 
    }
  }
  }


  module.exports = {
    onFileSystem,
    resetFS,
    getMemoryFS
  }