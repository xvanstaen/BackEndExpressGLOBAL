const nodecache = require('node-cache');
var tabFile = new nodecache;
var cacheConsole= new nodecache;

const stdFunctions = require("./stdFunctions");

function serverVersion(){
  const myVersion="Version 10Jan2024 V0-1";
  return(myVersion)
}

const getServerVersion = async (req, res) => { 
  const myVersion=serverVersion();
  return res.send({status:200,version:myVersion});
}

async function cacheFiles(testProd,fileName,bucketName){
    var listFiles=[];
    var i=0;
    if (tabFile.has(0)){
      listFiles = tabFile.get(0);
    }
    if (tabFile.has(0)===false || (tabFile.has(0) && listFiles.length===0) ){
      const data = await getFilesToCache(testProd);
      if (data.status === 200){``
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


const getFilesToCache = async function (testProd) {
  try{
    var filesToCache=[];
    var testConfig="";
    if ( cache.has(0)){ // should always be true
      if (testProd.toLowerCase()==='prod'){
        testConfig=cache.get(0);
      } else {
        testConfig=cache.get(1);
      }
      for (var i=0; i<testConfig.filesToCache.length; i++){
          const theClass= {bucket:"",object:""};
          filesToCache.push(theClass);
          if (testConfig.filesToCache[i].bucket!==undefined){
            filesToCache[i].bucket=testConfig.filesToCache[i].bucket;
            filesToCache[i].object=testConfig.filesToCache[i].object;
          } else {
            filesToCache[i].bucket="";
            filesToCache[i].object=testConfig.filesToCache[i];
          }   
      }
      return ({status:200, tab:filesToCache});
    } else {
      return ({status:501,mesage:'configData cache does not exist; pb when server was initialised'})
    }  
  }
  catch(err) {
    return res.status(521).send({status:521, message:"FAILURE " + err.message});
  }; 
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
  
  function fillCacheFileUpdate(record,updated){
    var listFiles=[];
    listFiles = tabFile.get(0); 
    listFiles[record].updated=updated; 
      tabFile.set(0, listFiles);
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
  
  module.exports={
    getServerVersion,
    serverVersion,
    cacheFiles,
    insertCacheFile,
    getCacheFile,
    getFilesToCache,
    reloadCacheFile,
    resetCacheFile,
    fillCacheFileUpdate,
    getCacheConsole,
    fillCacheConsole,
    resetCacheConsole,
    
  }