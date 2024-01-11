const nodecache = require('node-cache');
var cacheConsole= new nodecache;
const stdFunctions = require("./stdFunctions");

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
    getCacheConsole,
    fillCacheConsole,
    resetCacheConsole,
  }