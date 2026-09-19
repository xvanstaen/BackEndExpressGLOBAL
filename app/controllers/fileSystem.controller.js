

const { MAX_RETRY_DEFAULT } = require("@google-cloud/storage/build/src/storage");
const { Storage } = require("@google-cloud/storage");

const fileController = require("./file.controller");
const stdFunctions = require("./stdFunctions");
const authFn = require("./authFn");
const cacheConsole = require("./cacheConsole");

const { stringify } = require("querystring");
const {google} = require('googleapis');
const http = require('http');
const https = require('https');
const url = require('url');
const securityCtrl = require("./securityCtrl.js");

const nodecache = require('node-cache');

var credentialCache = new nodecache;
var fileSystemCache = new nodecache;

var lockFileSystem=[];
var theProjectId="";
var theServer="";

/*****
function initCacheCredentialsFS(server){
  var credentials={creationDate:"", userServerId:0, server:server};
  
  const myDate = stdFunctions.defineMyDate();

  credentials.creationDate = myDate;
  credentialCache.set(0,credentials);
  return({status:200, credentials:credentials})
}

function getCredentialsInFS(server){
  //var credentials={creationDate:"", userServerId:0, server:server};
  if ( credentialCache.has(0)){
    credentials=credentialCache.get(0);
  } else {
    const myCred=initCacheCredentialsFS(server);
    credentials=myCred.credentials;
  }
  
  credentialCache.set(0,credentials);
  return({status:200, credentials:credentials})
}

function getNewFSUserId(server){
  const theValue = getCredentialsInFS(server);
  
  theValue.credentials.userServerId++;
  credentialCache.set(0,theValue.credentials);
  return({status:200, credentials:theValue.credentials})
}

const getFSCredentials= async (req, res) => {
  const theValue=getCredentialsInFS(req.params.server);
  return res.send({status:200, credentials:theValue.credentials})
}

const getFSNewUserId= async (req, res) => {
  const theValue=getNewFSUserId(req.params.server);
  return res.send({status:200, credentials:theValue.credentials})
}
*****/

const onFileSystem = async (req, res) => {
  var credentials='';
  var myFileSystem=[];
  var theMsg="";
  theProjectId=req.params.projectId;
  theServer=req.params.server;
  var i=0;
  try {

    var tabLock=JSON.parse(req.params.tabLock);
    cacheConsole.fillCacheConsole(req.params.server,req.params.projectId,'File System',"=== start the process for user "+ +tabLock[req.params.iWait].userServerId, {tabLock:tabLock[req.params.iWait]}); 
    var theStatus = [];         
    //console.log('theFileParse=',theFileParse);
    var tabInUse=[];
    

    if (tabLock[0].action!=='onDestroy'  ){
          const theValue = await authFn.getCredentialsFn(req.params.server);

          credentials=theValue.credentials;
          credentialCache.set(0, credentials);
          cacheConsole.fillCacheConsole(req.params.server,req.params.projectId,'File System',"credentials retrieved, theValue.status="+ theValue.status, {credentials:theValue.credentials});
          if (theValue.status!==200){
            return({err:theValue.status, msg:"pb when retrieving credentials on server " + req.params.server});
          }
          // retrieve FS file as it may have been created through another server
          myFileSystem = await getFileSystem(req.query.bucket, req.params.projectId, tabLock[req.params.iWait].objectName);
          cacheConsole.fillCacheConsole(req.params.server,req.params.projectId,'File System',"file "+ tabLock[req.params.iWait].objectName +" retrieved",{fileSystem:myFileSystem});
          i=0;
          if (myFileSystem.length>0){
            for (i=0; i< myFileSystem.length && 
              ( myFileSystem[i].object!==tabLock[req.params.iWait].object ||  myFileSystem[i].bucket!==tabLock[req.params.iWait].bucket ); i++){}
          }
          // check if the retrieved credentials are the same as those provided by the application for this user; if not then download File System from Cloud Storage 
          if (credentials.userServerId===undefined || tabLock[req.params.iWait].credentialDate !== credentials.creationDate || (myFileSystem.length>0 && i<myFileSystem.length && myFileSystem[i].server!==req.params.server)){
            // retrieve the File System -> objectName refers to the functionality that is locked 
            cacheConsole.fillCacheConsole(req.params.server,req.params.projectId,'File System',"credentials or server are/is different, tabLock[req.params.iWait].credentialDate="+tabLock[req.params.iWait].credentialDate,{credentials:credentials});
            myFileSystem = await getFileSystem(req.query.bucket, req.params.projectId, tabLock[req.params.iWait].objectName);
            if (myFileSystem.length>0){
                
                if (i< myFileSystem.length && (myFileSystem[i].credentialDate !== tabLock[req.params.iWait].credentialDate ||
                            myFileSystem[i].server!==req.params.server)) { // was before=> credentials.creationDate
                  // need to check if timeout occured; if NO then return msg to the requesting app-user otherwise assign the record to this user
                
                  const timeOutValue=stdFunctions.fnAddTime(myFileSystem[i].updatedAt,myFileSystem[i].timeoutFileSystem.hh,myFileSystem[i].timeoutFileSystem.mn);
                  const currentTime=stdFunctions.defineMyDate();
                  if (Number(currentTime) <= Number(timeOutValue)){
                    theMsg="server was reset or other server was used and file is still locked by another user; didn't reach time out yet";
                    console.log(theMsg);
                    cacheConsole.fillCacheConsole(req.params.server,req.params.projectId,'File System',theMsg)
                    cacheConsole.fillCacheConsole(req.params.server,req.params.projectId,'File System',"myFileSystem[i].server="+myFileSystem[i].server+" req.params.server="+req.params.server, {status:956,updatedAt:myFileSystem[i].updatedAt,timeOut:timeOutValue,currentTime:currentTime});

                    cacheConsole.fillCacheConsole(req.params.server,req.params.projectId,'File System',"myFileSystem[i].credentialDate="+myFileSystem[i].credentialDate,"tabLock[req.params.iWait].credentialDate="+tabLock[req.params.iWait].credentialDate)
                    cacheConsole.fillCacheConsole(req.params.server,req.params.projectId,'File System','=== end of the process')
                    return res.send({msg: theMsg, status:956});   
                  }
                  theMsg='server was reset or another server was used and file was locked by another user but timeout occured; so file is locked for requesting user';
                  console.log(theMsg);
                  cacheConsole.fillCacheConsole(req.params.server,req.params.projectId,'File System',theMsg,{status:0,updatedAt:myFileSystem[i].updatedAt,timeOut:timeOutValue,currentTime:currentTime});
                } 
            }
            // file is not locked by any user so process continues
            cacheConsole.fillCacheConsole(req.params.server,req.params.projectId,'File System',"file is not locked by any user so process continues", {credentials:credentials});
            
            const theValue=await authFn.getNewServerUsrIdFn(req.params.server);
            credentials=theValue.credentials;
            credentialCache.set(0, credentials);

            cacheConsole.fillCacheConsole(req.params.server,req.params.projectId,'File System',"new userId assigned theValue.status="+ theValue.status, {credentials:theValue.credentials});
            tabLock[req.params.iWait].credentialDate=credentials.creationDate;
            tabLock[req.params.iWait].userServerId=theValue.credentials.userServerId;
            cacheConsole.fillCacheConsole(req.params.server,req.params.projectId,'File System',"new userId assigned theValue.userServerId="+ theValue.credentials.userServerId);
            resetInUseFileSystem(tabLock[req.params.iWait]); // ensure that corresponding memory data is released
            // last update was performed by same user or timeout occured for the other user
            if (myFileSystem.length>0){ 
                myFileSystem.splice(i,1);
                const code = await saveFS(req.params.projectId, req.query.bucket,tabLock[req.params.iWait].objectName,JSON.stringify(myFileSystem),tabLock[req.params.iWait]);
                if (code===200|| code===201){
                  theMsg="Record in File System is successfully deleted";
                } else { 
                  theMsg="Error:"+ code +" when trying to save File System after deletion of the record"   
                }
            } else {
                theMsg='File System is empty so it will be locked for the requesting user';
            }
            cacheConsole.fillCacheConsole(req.params.server,req.params.projectId,'File System',theMsg,{fileSystem:myFileSystem});
            console.log(theMsg);

            /**  there is no 'else' because if the record is not locked by another user then the lock will be done for this requesting  application user 
            ***/
          }

          cacheConsole.fillCacheConsole(req.params.server,req.params.projectId,'File System','===> in updateFileSystem() for user '+tabLock[req.params.iWait].userServerId,{tabLock:tabLock[req.params.iWait]});
          console.log('===> in updateFileSystem() for user ' + JSON.stringify(tabLock[req.params.iWait]) );
          console.log('lockFileSystem='+JSON.stringify(lockFileSystem));
         
          const inUse=inUseFileSystem(tabLock[req.params.iWait],req.params.server); // CHECK WHAT IS THE PURPOSE
          if (inUse.code!==0 ){
            console.log('retry later, status error=' + inUse.code);
            return res.send({msg: 'retry later', status:inUse.code});
          }
          
        
        if (tabLock[req.params.iWait].action==='lock'|| tabLock[req.params.iWait].action==='unlock' ||
              tabLock[req.params.iWait].action==='check' || tabLock[req.params.iWait].action==='check&update'
              || tabLock[req.params.iWait].action==='updatedAt' ) 
              {

            var trouve = false;
            var tabFS=[];
            var record=0;

            if (fileSystemCache.has(0)){
                tabFS = fileSystemCache.get(0);
            }
            //myFileSystem = await getFileSystem(req.query.bucket, req.params.projectId, tabLock[req.params.iWait].objectName)
            for (record=0; record<tabFS.length && tabFS[record].fileName!==tabLock[req.params.iWait].objectName; record++){}
            if (record===tabFS.length){
                const recordFS={fileName:"", content:""}
                tabFS.  push(recordFS);
            }
                
            tabFS[record].fileName=tabLock[req.params.iWait].objectName;
            tabFS[record].content=myFileSystem;
            fileSystemCache.set(0,tabFS);
            console.log('memory record is created for ' + tabLock[req.params.iWait].objectName);
            cacheConsole.fillCacheConsole(req.params.server,req.params.projectId,'File System','memory record is created for ' + tabLock[req.params.iWait].objectName,{fileSystem:myFileSystem});
                
            cacheConsole.fillCacheConsole(req.params.server,req.params.projectId,'File System','call checkData');
            theStatus =checkData(myFileSystem, req.params.iWait, tabLock, credentials.creationDate,req.params.server);
            
            if (theStatus.theFile !== undefined){
            
                if (theStatus.record !== undefined && tabLock[req.params.iWait].action==='lock' || tabLock[req.params.iWait].action==='check&update' || tabLock[req.params.iWait].action==='updatedAt'){
                    tabLock[req.params.iWait].lock=1;
                    tabLock[req.params.iWait].createdAt=theStatus.theFile[theStatus.record].createdAt;
                    tabLock[req.params.iWait].updatedAt=theStatus.theFile[theStatus.record].updatedAt;
                    cacheConsole.fillCacheConsole(req.params.server,req.params.projectId,'File System','after checkData', {tabLock:theStatus.theFile[req.params.iWait]});
                } else  if (tabLock[req.params.iWait].action==='unlock'){
                    tabLock[req.params.iWait].lock=3;
                    cacheConsole.fillCacheConsole(req.params.server,req.params.projectId,'File System','after checkData, tabLock[req.params.iWait].lock=3', {tabLock:tabLock[req.params.iWait]});
                };
                const code = await saveFS(req.params.projectId, req.query.bucket,tabLock[req.params.iWait].objectName,JSON.stringify(theStatus.theFile),tabLock[req.params.iWait]);
                cacheConsole.fillCacheConsole(req.params.server,req.params.projectId,'File System','after saveFS', {code:code});
                if (code===200 || code===201){
                  tabFS[record].content=myFileSystem;
                  fileSystemCache.set(0,tabFS);
                  if (tabInUse[req.params.iWait]===0){
                    resetInUseFileSystem(tabLock[req.params.iWait]);
                    tabInUse[req.params.iWait]===1;
                  }
                  if (code===200){
                    return res.send({tabLock:tabLock, msg: tabLock[req.params.iWait].action + " is completed for user " + tabLock[req.params.iWait].userServerId, status:200});
                  } 
                  return res.send({tabLock:tabLock, msg: tabLock[req.params.iWait].action + " is completed without metadata for user " + tabLock[req.params.iWait].userServerId, status:200});
                } 
                return res.send({msg:"after save is a failure for user " + tabLock[req.params.iWait].userServerId +  ' on action ' + tabLock[req.params.iWait].action, status:700});
            

            } else { // error code is returned
                    resetInUseFileSystem(tabLock[req.params.iWait]);
                    cacheConsole.fillCacheConsole(req.params.server,req.params.projectId,'File System','after checkData Code ' + theStatus + '  returned for action = ' + tabLock[req.params.iWait].action + " for user " + tabLock[req.params.iWait].userServerId);
                    console.log("Code " + theStatus + '  returned for action = ' + tabLock[req.params.iWait].action + " for user " + tabLock[req.params.iWait].userServerId)
                    return res.send({msg:"Code " + theStatus + '  returned for action = ' + tabLock[req.params.iWait].action + " for user " + tabLock[req.params.iWait].userServerId , status:theStatus});
            }

        } else {
            resetInUseFileSystem(tabLock[req.params.iWait]);
            return res.send({msg:"wrong action for user " + tabLock[req.params.iWait].userServerId, status:998});
        }
      }

      //  (tabLock[0].action==='onDestroy'  ){
    cacheConsole.fillCacheConsole(req.params.server,req.params.projectId,'File System','===> onDestroy for user '+tabLock[req.params.iWait].userServerId,{tabLock:tabLock[req.params.iWait]});
    for (var iWait=0; iWait<tabLock.length; iWait++){
          
        if (tabLock[iWait].lock===1){
          tabLock[iWait].action='unlock';
          const inUse = inUseFileSystem(tabLock[iWait],req.params.server);
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
              if (trouve === false){
                myFileSystem = await getFileSystem(req.query.bucket, req.params.projectId, tabLock[iWait].objectName);
                const recordFS={fileName:"", content:""}
                tabFS.push(recordFS);
                tabFS[tabFS.length-1].fileName=tabLock[iWait].objectName;
                tabFS[tabFS.length-1].content=myFileSystem;
                record=tabFS.length-1;
                fileSystemCache.set(0,tabFS);
              }
              cacheConsole.fillCacheConsole(req.params.server,req.params.projectId,'File System',"on Destroy iWait="+iWait,{tabLock:tabLock[iWait],credentials:credentials}); 
              theStatus = checkData(myFileSystem, iWait, tabLock, credentials.creationDate, req.params.server);

              if (theStatus.theFile !== undefined){
                  cacheConsole.fillCacheConsole(req.params.server,req.params.projectId,'File System',"on Destroy before saveFS of "+tabLock[iWait].objectName); 
                  const code = await saveFS(req.params.projectId, req.query.bucket,tabLock[iWait].objectName,JSON.stringify(theStatus.theFile),tabLock[iWait]);
                  
                  if (code===200 || code===201){
                    tabFS[record].content=myFileSystem;
                    fileSystemCache.set(0,tabFS);
                    if (tabInUse[iWait]===0){
                      resetInUseFileSystem(tabLock[iWait]);
                      tabInUse[iWait]=1;
                    }
                    cacheConsole.fillCacheConsole(req.params.server,req.params.projectId,'File System',"on Destroy aftersaveFS of "+tabLock[iWait].objectName + '  code='+code); 
                    if (code===200){
                      console.log('status = 200' + tabLock[req.params.iWait].action + " is completed for user " + tabLock[req.params.iWait].userServerId);
                      //return res.send({tabLock:tabLock, msg: tabLock[req.params.iWait].action + " is completed for user " + tabLock[req.params.iWait].userServerId, status:200});
                    } else if (code===201){
                      console.log('status = 201' + tabLock[req.params.iWait].action + " is completed without metadata for user " + tabLock[req.params.iWait].userServerId);
                      //return res.send({tabLock:tabLock, msg: tabLock[req.params.iWait].action + " is completed without metadata for user " + tabLock[req.params.iWait].userServerId, status:200});
                    }
                  } else {
                    console.log('status = 700' + "after save is a failure for user " + tabLock[req.params.iWait].userServerId +  ' on action ' + tabLock[req.params.iWait].action);
                    // return res.send({msg:"after save is a failure for user " + tabLock[req.params.iWait].userServerId +  ' on action ' + tabLock[req.params.iWait].action, status:700});
                  }
              } else {
                // no destroy because record didn't belong to this user
                // release the unlock
                console.log('cannot destroy record of ' + tabLock[iWait].objectName + ' userServerId ' +  tabLock[iWait].userServerId +   ' Error:' + theStatus)
                if (tabInUse[iWait]===0){
                  resetInUseFileSystem(tabLock[iWait]);
                  tabInUse[iWait]===1;
                }
              }
          }
        }
        cacheConsole.fillCacheConsole(req.params.server,req.params.projectId,'File System',"on Destroy is completed for userServerId "+tabLock[0].userServerId);
        console.log('on Destroy is completed for userServerId ' +  tabLock[0].userServerId)
        return res.send({msg:"on Destroy is completed", status:200});
      // ============ end of onDestroy process
    }
  catch (err) {
    
    const tabLock=JSON.parse(req.params.tabLock);
    cacheConsole.fillCacheConsole(req.params.server,req.params.projectId,'File System','global failure for user ' + tabLock[req.params.iWait].userServerId, {error:err, status:700, tabLock:tabLock[req.params.iWait]});

    if (tabLock[0].action==='onDestroy'){
      for (var iWait=0; iWait<tabLock.length; iWait++){
        if (tabLock[iWait].lock===1){
          tabLock[iWait].action='onDestroy';
          resetInUseFileSystem(tabLock[iWait]);
        } 
      }
    }
    console.log('global failure for user ' + tabLock[req.params.iWait].userServerId , {error:err, status:700});
    resetInUseFileSystem(tabLock[req.params.iWait]);
    return res.send({msg:"global failure for user " + tabLock[req.params.iWait].userServerId + 'err='+err, status:700}); 
  /*  } */
  } 
};

const getMemoryFS= async (req, res) => {
  try{
    const securityLevel= await securityCtrl.getSecurityAccess(req.params.projectId, req.params.userId,req.params.userPSW);
    if (securityLevel.status!==200){
      return res.send(securityLevel);
    } 

    if (securityLevel.accessLevel!=='High' && securityLevel.accessLevel!=='Very High'){
      return res.send({status:220,msg:"you don't have the right level of security access"});
    }
    var tabFS=[];
    if (fileSystemCache.has(0)){
      tabFS = fileSystemCache.get(0);
    } 
    return res.send({status:200, data:tabFS})
  }
  catch (err){
    return ({msg:"System failure " + err, status:700});
  }
}

const resetFS= async (req, res) => {

  try{
    const securityLevel= await securityCtrl.getSecurityAccess(req.params.projectId, req.params.userId,req.params.userPSW);
    if (securityLevel.status!==200){
      return res.send(securityLevel);
    } 

    if (securityLevel.accessLevel!=='High' && securityLevel.accessLevel!=='Very High'){
      return res.send({status:220,msg:"you don't have the right level of security access"});
    }

      // *** how to manage several records within one file system? Can it happen?
    var tabLock=JSON.parse(req.params.tabLock);
    var myFileSystem=[];
    var tabFS=[];
    var newTabFS=[];
    var record=0;
    var nbFileProcessed=0;
    var nbFileRemoved=0;
    var code=0;
  
      // const inUse=inUseFileSystem(tabLock[req.params.iWait]);
    if (tabLock[req.params.iWait].action!=="resetAll" && fileSystemCache.has(0)){
        tabFS = fileSystemCache.get(0);
        for (record=0; record<tabFS.length && tabFS[record].fileName!==tabLock[req.params.iWait].objectName && req.params.server===tabFS[record].content[0].server; record++){}
        if (record<tabFS.length) {
            myFileSystem = await getFileSystem(req.query.bucket, req.params.projectId, tabFS[record].fileName);
            for (j=0; j<myFileSystem.length && (tabLock[req.params.iWait].objectName!==myFileSystem[j].objectName || myFileSystem[j].server===req.params.server); j++){
              if (j<myFileSystem.length){
                myFileSystem.splice(j,1);
                code = await saveFS(req.params.projectId, req.query.bucket,tabLock[req.params.iWait].objectName,JSON.stringify(myFileSystem),tabLock[req.params.iWait]);
    
              }
            }if (code===200 || code===201){
              tabFS[record].content.splice(0,1);
              fileSystemCache.set(0,tabFS);
            }
            if (code===200){
              return res.status(200).send({status:200,msg:'file system ' + req.params.name + ' has been reset for ' + tabLock[req.params.iWait].object + ' , file saved with metadata'});
            } else if (code===201){
              return res.status(201).send({status:201,msg:'file system ' + req.params.name + ' has been resetfor ' + tabLock[req.params.iWait].object + ', file saved but metaData not updated'});
            } else {
                return res.status(202).send({status:202, msg:'file system memory has been reset but file ' + req.params.name + ' could not be saved'});
            }
          } 
          return res.status(203).send({status:203,msg:'file system memory' + req.params.name + ' has been reset but record '+ tabLock[req.params.iWait].object + ' in file ' + req.params.name + ' was not found'});
        } else if (tabLock[req.params.iWait].action==="resetAll"  && fileSystemCache.has(0)){
            tabFS = fileSystemCache.get(0);
            for (var i=tabFS.length-1; i>-1; i--){
              if (req.params.server===tabFS[i].content[0].server){
                myFileSystem = await getFileSystem(req.query.bucket, req.params.projectId, tabFS[i].fileName);
                const lenFile=myFileSystem.length;
                var j=0;
                for (j=myFileSystem.length-1; j>-1; j--){
                  if (myFileSystem[j].object===tabFS[i].content[0].object && 
                    myFileSystem[j].bucket===tabFS[i].content[0].bucket && 
                    myFileSystem[j].server===tabFS[i].content[0].server){
                    myFileSystem.splice(j,1);
                  }
                }
                if (myFileSystem.length !== lenFile){
                  const code = await saveFS(req.params.projectId, req.query.bucket,tabFS[i].fileName,JSON.stringify(myFileSystem),tabLock[req.params.iWait]);
                  if (code===200 || code===201){
                    nbFileProcessed++;
                  }
                } 
                tabFS.splice(i,1);
                nbFileRemoved++;
              }
            }   
            tabFS=[];
            fileSystemCache.set(0,tabFS);
            return res.status(200).send({status:200,msg: nbFileProcessed + ' file(s)/record(s) removed '+  nbFileRemoved + ' file(s) removed from memory'});``
        } else {
          if (fileSystemCache.has(0)){
            return res.status(205).send({status:206,msg:'FS memory cache does not contain records corresponding to the request'});
          } else {
            return res.status(200).send({status:205,msg:'FS memory cache is empty'});
          }
          
        }

  }
  catch (err){
    return ({msg:"System failure " + err, status:700});
  }
}

function inUseFileSystem(tablockItem, server){

  const recordFS={
    action:"", objectName:"", createdAt:"", updatedAt:"", access:0, userServerId:0, userName:"", dateTime:"",server:"",
    timeoutFileSystem:{hh:0, mn:0}
  }

  for (var i=0; i<lockFileSystem.length && lockFileSystem[i].objectName!==tablockItem.objectName; i++){ }
  if (i===lockFileSystem.length){
    lockFileSystem.push(recordFS);
    lockFileSystem[lockFileSystem.length-1].objectName = tablockItem.objectName;
    lockFileSystem[lockFileSystem.length-1].action = tablockItem.action;
    lockFileSystem[lockFileSystem.length-1].createdAt = tablockItem.createdAt;
    lockFileSystem[lockFileSystem.length-1].updatedAt = tablockItem.updatedAt;
    lockFileSystem[lockFileSystem.length-1].userServerId = tablockItem.userServerId;
    lockFileSystem[lockFileSystem.length-1].userName = tablockItem.user;
    lockFileSystem[lockFileSystem.length-1].timeoutFileSystem.hh = tablockItem.timeoutFileSystem.hh;
    lockFileSystem[lockFileSystem.length-1].timeoutFileSystem.mn = tablockItem.timeoutFileSystem.mn;
    lockFileSystem[lockFileSystem.length-1].server=server;
    lockFileSystem[lockFileSystem.length-1].access=0;
    lockFileSystem[lockFileSystem.length-1].dateTime=stdFunctions.defineMyDate();
    
    return({code:0});
  } else {
    console.log('action on' + tablockItem.objectName + '  userServerId=' + tablockItem.userServerId + '  already requested by another resource');
    const refDate = stdFunctions.fnAddTime(lockFileSystem[i].dateTime, 0, 2); // 0h2mn
    const currentDateTime=stdFunctions.defineMyDate();
    if (currentDateTime > refDate){
      // the lock was for too long; previous error not detected; 
      console.log(' lockFile record is updated because it was there for more than 2 minutes'); 
      lockFileSystem[i].objectName = tablockItem.objectName;
      lockFileSystem[i].action = tablockItem.action;
      lockFileSystem[i].createdAt = tablockItem.createdAt;
      lockFileSystem[i].updatedAt = tablockItem.updatedAt;
      lockFileSystem[i].userServerId = tablockItem.userServerId;
      lockFileSystem[i].timeoutFileSystem.hh = tablockItem.timeoutFileSystem.hh;
      lockFileSystem[i].timeoutFileSystem.mn = tablockItem.timeoutFileSystem.mn;
      lockFileSystem[i].access=0;
      lockFileSystem[i].server=server;
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
    const theMsg = 'resetInUseFileSystem - record ' + tablockItem.objectName  + '  userServerId=' + tablockItem.userServerId +  ' not found - CHECK THE CODE --- lockFileSystem.length=' + lockFileSystem.length;
    console.log(theMsg);
    cacheConsole.fillCacheConsole(theServer,theProjectId,'File System', theMsg);
  }
  return(0);
}

async function saveFS(projectId, bucket,object,fileContent,tablockItem){
  //const storage = await authFn.getClient(projectId);
  const storage = new Storage();
  var bucketFileSystem = storage.bucket(bucket);
  bucketFileSystem.projectId=projectId;
  bucketFileSystem.id=bucket;
  bucketFileSystem.name=bucket;

  await bucketFileSystem.file(object).save(fileContent); 
  try{
    //const storage = await authFn.getClient(projectId);
    const storage = new Storage();
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
          //return res.send({tabLock:tabLock, msg: tablockItem.action + " is completed for user " + tablockItem.userServerId, status:200});
        } 
        return(200);

        
      }
      catch (err) {
        if (tablockItem.action!=='onDestroy'){
          console.log(tablockItem.action + " is completed without metadata for user " + tablockItem.userServerId + " error==>" + err);
          resetInUseFileSystem(tablockItem);
          //return res.send({tabLock:tabLock, msg: tablockItem.action + " is completed without metadata for user " + tablockItem.userServerId, status:200});
        } 
        return(201);

      }
      
    }
  catch (err) {
    if (tablockItem.action!=='onDestroy'){
        console.log('after save is a failure for user ' + tablockItem.userServerId + '  error= ' + err);
        resetInUseFileSystem(tablockItem);
        //return res.send({msg:"after save is a failure for user " + tablockItem.userServerId +  ' on action ' + tablockItem.action, status:700});
      } 
      console.log('saveFS ==> error detected - 700');
      return(700);
     
    }
}

async function getFileSystem(theBucket, projectId, fileName){
  try{
    const storage = new Storage();
    //const storage = await authFn.getClient(projectId);
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

function checkData(fileSystem, iWait, tabLock, credentialDate, server){
  //console.log('start checkData');
  if (fileSystem.length > 0 ){
    for (var i=0; i<fileSystem.length && (fileSystem[i].object!==tabLock[iWait].object || fileSystem[i].bucket!==tabLock[iWait].bucket); i++){}
    //if (i<fileSystem.length && fileSystem[i].credentialDate!==credentialDate){ // server was reinitiated      
    //  fileSystem.splice(i,1); // delete the record and create a new one
    //  const createFS = stdFunctions.createRecord(fileSystem,tabLock[iWait], server);
    //  return({theFile:createFS, record:createFS.length-1});
    //}
    if (tabLock[iWait].action==="lock"){
        if (i===fileSystem. length ){
            // record not found so create a new record and flag lock to true
            const createFS = stdFunctions.createRecord(fileSystem,tabLock[iWait], server);
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
                const validate=stdFunctions.validateLock(fileSystem,tabLock[iWait],i,server);
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
           if (fileSystem[i].createdAt === tabLock[iWait].createdAt && 
              fileSystem[i].userServerId === tabLock[iWait].userServerId // file is already locked by same user
              ){
            console.log("unlock tabLock[iWait].createdAt" + tabLock[iWait].createdAt + '  fileSystem[i].createdAt ' + fileSystem[i].createdAt);
            fileSystem.splice(i,1);
            return({theFile:fileSystem});
          } else {
            console.log('record found but createdAt is different ,  so cannot be unlocked - Error 710');
            return(710);
          }
        }
    } else if (tabLock[iWait].action==="updatedAt"){
      if (tabLock[iWait].createdAt === fileSystem[i].createdAt  && 
              fileSystem[i].userServerId === tabLock[iWait].userServerId) {
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
            const createFS = stdFunctions.createRecord(fileSystem,tabLock[iWait], server);
            return({theFile:createFS, record:createFS.length-1});
          }
          
      } else {
        if (tabLock[iWait].createdAt === fileSystem[i].createdAt && tabLock[iWait].updatedAt === fileSystem[i].updatedAt && tabLock[iWait].userServerId === fileSystem[i].userServerId){
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
        const createFS = stdFunctions.createRecord(fileSystem,tabLock[iWait], server);
        return({theFile:createFS, record:createFS.length-1});
    } else if (tabLock[iWait].action==="check"  || tabLock[iWait].action==="check&update"){
        if (tabLock[iWait].action==="check"){
          console.log('check file = fileSystem ' +tabLock[iWait].objectName + 'is empty; return inData.status 800');
          tabLock[iWait].createdAt='';
          tabLock[iWait].updatedAt='';
          tabLock[iWait].status=800;
          return({tabLockItem:tabLock[iWait]});
        } else {
          const createFS = stdFunctions.createRecord(fileSystem,tabLock[iWait], server);
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
    getMemoryFS,

  }