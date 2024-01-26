const nodecache = require('node-cache');
var cacheConsole= new nodecache;
const stdFunctions = require("./stdFunctions");
const authFn = require("./authFn");
const securityCtrl = require("./securityCtrl.js");
const fileFn = require("./fileFn.js");
var theServer="";

async function uploadCacheConsole(projectId, logConsole){
  var theTab=[];
  const myDate=stdFunctions.defineMyDate();
  const object=myDate.substring(0,8)+'serverCacheConsole';
  const bucket='logconsole';
  if (logConsole.length>0){
    try {
      const theValue = await fileFn.getFileFn(projectId, bucket,object);
      try{
        if (theValue.status===200){
          theTab = theValue.data;
          if (Array.isArray(logConsole) === false) {
            const tabRecord={server:"",theDate:"", module:"", msg:"", content:""}
            theTab.push(tabRecord); 
            theTab[theTab.length-1] = fillTheTab(logConsole, theTab[theTab.length-1])
          } else {
            for (var i=0; i<logConsole.length; i++){
              const tabRecord={server:"",theDate:"", module:"", msg:"", content:""}
              theTab.push(tabRecord); 
              theTab[theTab.length-1] = fillTheTab(logConsole[i], theTab[theTab.length-1]);
            }
          }
        } 
      }
      catch (err){
          // file is not found; 
         
      }
      if (theTab.length===0){
        for (var i=0; i<logConsole.length; i++){
          const tabRecord={server:"",theDate:"", module:"", msg:"", content:""}
          theTab.push(tabRecord); 
          theTab[theTab.length-1] = fillTheTab(logConsole[i], theTab[theTab.length-1]);
        }
      }
      const code = await fileFn.saveFileFn(projectId, bucket,object,JSON.stringify(theTab));
      return {status:code,msg:''};
      
    }
    catch (err) {
      console.log('uploadCacheConsole ==> failure - 700');
      return({status:700,msg:'uploadCacheConsole ==> failure'});
    }
  } else {
    return {status:210,msg:'cache console is empty'};
  }
}

function fillTheTab(inTab,outTab){
  
  outTab.theDate=inTab.theDate
  outTab.module=inTab.module;
  if (inTab.content!==undefined){
    outTab.content=inTab.content;
  }
  if (inTab.msg!==undefined){
    outTab.msg=inTab.msg;
  }
  if (inTab.server!==undefined){
    outTab.server=inTab.server;
  } else {
    outTab.server=theServer;
  }
  return(outTab);
}

async function fillCacheConsole(server, projectId,module,theMsg, content){
   
    var theTab=[];
    theServer=server;
    const myDate=stdFunctions.defineMyDate();
    if (cacheConsole.has(0)){
        theTab = cacheConsole.get(0);
        const tabRecord={theDate:"", module:"", msg:"", content:""}
        theTab.push(tabRecord); 
        theTab[theTab.length-1].theDate=myDate.substring(0,4)+'/'+myDate.substring(4,6)+'/'+myDate.substring(6,8)+' '+myDate.substring(8,10)+':' +myDate.substring(10,12)+':'+myDate.substring(12,14)+' ' +myDate.substring(14);
        theTab[theTab.length-1].module=module;
        theTab[theTab.length-1].content=content;
        theTab[theTab.length-1].msg=theMsg;
        cacheConsole.set(0, theTab);
        if (theTab.length>20){ // maximum 20 records
          cacheConsole.set(0, []);
          const myLog = theTab;
          theTab=[];
          const theValue = await uploadCacheConsole(projectId, myLog);
          if (theValue.status===700){
            theTab = cacheConsole.get(0);
            for (var i=myLog.length-1; i>-1; i--){
              const tabRecord={theDate:"", module:"", msg:"", content:""}
              theTab.splice(0,0,tabRecord);
              fillTheTab(myLog[i],theTab[0]);
            }
            cacheConsole.set(0, theTab);
          }
        } 
    } else {
      const tabRecord={theDate:"", module:"", msg:"", content:""}
      theTab.push(tabRecord); 
      theTab[theTab.length-1].theDate=myDate.substring(0,4)+'/'+myDate.substring(4,6)+'/'+myDate.substring(6,8)+' '+myDate.substring(8,10)+':' +myDate.substring(10,12)+':'+myDate.substring(12,14)+' ' +myDate.substring(14);
      theTab[theTab.length-1].module=module;
      theTab[theTab.length-1].content=content;
      theTab[theTab.length-1].msg=theMsg;
      cacheConsole.set(0, theTab);
    }
  
    
  }

  const getCacheConsole=async (req, res) => {
    try{
      const securityLevel= await securityCtrl.getSecurityAccess('xmv-it-consulting', req.params.userId,req.params.userPSW);
      if (securityLevel.status!==200){
        return res.send(securityLevel);
      } 

      if (securityLevel.accessLevel!=='Very High'){
        return res.send({status:585,msg:"you don't have the permission to use this functionality"});
      }
    
      if (cacheConsole.has(0)){
        const theTab=cacheConsole.get(0);
        return res.send({msg:theTab,status:200});
      } else {
        return res.send({msg:"nothing found in cacheConsole",status:220})
      }
    }
    catch (err){
      return res.status(521).send({status:521, msg:"FAILURE " + err.message});
    }
  }
  
  const resetCacheConsole=async (req, res) => {
    try{
      const securityLevel= await securityCtrl.getSecurityAccess('xmv-it-consulting', req.params.userId,req.params.userPSW);
      if (securityLevel.status!==200){
        return res.send(securityLevel);
      } 

      if (securityLevel.accessLevel!=='Very High'){
        return res.send({status:585,msg:"you don't have the permission to use this functionality"});
      }
      var theTab=[];
      cacheConsole.set(0, theTab);
      return res.send({msg:"cacheConsole is reset",status:200})
    }
    catch (err){
      return res.status(521).send({status:521, msg:"FAILURE " + err.message});
    }
  }
  
  module.exports={
    getCacheConsole,
    fillCacheConsole,
    resetCacheConsole,
  }