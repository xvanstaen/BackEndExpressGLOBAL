const nodecache = require('node-cache');
var cacheConsole= new nodecache;
const stdFunctions = require("./stdFunctions");
const securityCtrl = require("./securityCtrl.js");

function fillCacheConsole(theMsg, content){
   
    var theTab=[];
    
    if (cacheConsole.has(0)){
        const tempTab = cacheConsole.get(0);
        if (tempTab.length<100){ // maximum 100 records
          theTab=cacheConsole.get(0);
        }
    }
    const myDate=stdFunctions.defineMyDate();
    const tabRecord={theDate:"", msg:"", content:""}
    theTab.push(tabRecord); 
    theTab[theTab.length-1].theDate=myDate.substring(0,4)+'/'+myDate.substring(4,6)+'/'+myDate.substring(6,8)+' '+myDate.substring(8,10)+':' +myDate.substring(10,12)+':'+myDate.substring(12,14)+' ' +myDate.substring(14);
    theTab[theTab.length-1].content=content;
    theTab[theTab.length-1].msg=theMsg;
    cacheConsole.set(0, theTab);
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
      return res.send({msg:"cacheConsole is reset",status:0})
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