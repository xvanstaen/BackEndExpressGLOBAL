const nodecache = require('node-cache');
var tabFile = new nodecache;

var cache= new nodecache;

const stdFunctions = require("./stdFunctions");
const config = require("./config.controller");
const fileCtrl = require("./file.controller");
const securityCtrl = require("./securityCtrl.js");




async function cacheFiles(testProd,fileName,bucketName){

    var listFiles=[];
    var i=0;
    if (tabFile.has(0)){
      listFiles = tabFile.get(0);
    }
    if (tabFile.has(0)===false || (tabFile.has(0) && listFiles.length===0) ){
      const data = await config.getFilesToCache(testProd);
      if (data.status === 200){
        for (var i=0; i<data.tab.length; i++){
          const classFile= {file:'',bucket:'',updated:true};
          listFiles.push(classFile);
          listFiles[i].file=data.tab[i].object;
          listFiles[i].bucket=data.tab[i].bucket;
        }
        tabFile.set(0, listFiles);
      } else {
        console.log('pb to retrieve filesToCache ; cache listFiles remains empty; env=' + testProd + 
        'data.status=' + data.status);
      }
    } else {
      listFiles = tabFile.get(0);
    }
    for (i=0; i<listFiles.length && (fileName!==listFiles[i].file || bucketName!==listFiles[i].bucket);  i++){}
    return({tab:listFiles,record:i});
  }



  function fillCacheFileUpdate(record,updated){
    var listFiles=[];
    listFiles = tabFile.get(0); 
    listFiles[record].updated=updated; 
      tabFile.set(0, listFiles);
  }

  const getCacheFile = async (req, res) => {
    try{
      
      const securityLevel= await securityCtrl.getSecurityAccess(req.params.projectId, req.params.userId,req.params.userPSW);
      if (securityLevel.status!==200){
        return res.send(securityLevel);
      } 

      if (securityLevel.accessLevel==='High' || securityLevel.accessLevel==='Very High'){
        var myData=await cacheFiles(req.params.testProd,"");
        return res.send({status:200,cacheFiles:myData.tab});
      }
      return res.send({status:585,msg:"you don't have the permission to use this functionality"});
    }
    catch (err){
      return ({error:"System failure " + err, status:700});
    }
  }
  
  const insertCacheFile = async (req, res) => {
    try{
      const securityLevel= await securityCtrl.getSecurityAccess(req.params.projectId, req.params.userId,req.params.userPSW);
      if (securityLevel.status!==200){
        return res.send(securityLevel);
      } 

      if (securityLevel.accessLevel==='High' || securityLevel.accessLevel==='Very High'){
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
      return res.send({status:585,msg:"you don't have the permission to use this functionality"});
    }
    catch (err){
      return ({error:"System failure " + err, status:700});
    }
  }
  
  
  const reloadCacheFile = async (req, res) => { // reaccess mongo DB
    try{
        const securityLevel= await securityCtrl.getSecurityAccess(req.params.projectId, req.params.userId,req.params.userPSW);
        if (securityLevel.status!==200){
          return res.send(securityLevel);
        } 

        if (securityLevel.accessLevel==='High' || securityLevel.accessLevel==='Very High'){
        if (tabFile.has(0)){
          tabFile.set(0, []);
        }
        var myData=await cacheFiles(req.params.testProd,"");
        return res.send({status:200,cacheFiles:myData.tab});
      }
      return res.send({status:585,msg:"you don't have the permission to use this functionality"});
    }
    catch (err){
      return ({error:"System failure " + err, status:700});
    }
  }
  
  const resetCacheFile = async (req, res) => {
    try{
      const securityLevel= await securityCtrl.getSecurityAccess(req.params.projectId, req.params.userId,req.params.userPSW);
      if (securityLevel.status!==200){
        return res.send(securityLevel);
      } 

      if (securityLevel.accessLevel==='High' || securityLevel.accessLevel==='Very High'){
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
      return res.send({status:585,msg:"you don't have the permission to use this functionality"});
    }
    catch (err){
      return ({error:"System failure " + err, status:700});
    }
  }
  

  
  module.exports={
    cacheFiles,
    insertCacheFile,
    getCacheFile,
    reloadCacheFile,
    resetCacheFile,
    fillCacheFileUpdate,
  }