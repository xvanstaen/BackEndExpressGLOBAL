
const authFn = require("./authFn");
const cryptoFn = require("./cryptoFn");
const cacheConsole = require("./cacheConsole.js");

var bucketCrypto='xmv-cryptodata';
var bucketLogin='manage-login';

async function getSecurityAccess(projectId, userId, PSW){
    try {
      const myDecrypt = await getUserPswRecord(projectId, userId );
      if (myDecrypt.data === "Key invalid" || myDecrypt.data !== PSW){
        return ({msg:"invalid id/psw", status:580});
      } 
      return ({status:200,accessLevel:myDecrypt.securityLevel})
    }
    catch (err){
      return ({error:"System failure " + err, status:700});
    }
  
  }

  async function getUserPswRecord(projectId, userId){
    const storage = await authFn.getClient(projectId);
    var bucket = storage.bucket(bucketLogin);
    bucket.projectId=projectId;
  
    const [downloadFile] = await bucket.file(userId+'PSW.json').download();
    try{
      const decrypt = await cryptoFn.getDecrypt(JSON.parse(downloadFile).psw , JSON.parse(downloadFile).key, JSON.parse(downloadFile).method ,0, projectId)
      return ({data:decrypt, bucketUserInfo:JSON.parse(downloadFile).bucketUserInfo, securityLevel:JSON.parse(downloadFile).security});
    }
    catch (err){
      return ({data:"Key invalid", bucketUserInfo:"",securityLevel:""})
    }
    
  }

  const getSecurityLevel= async (req, res) => {

    try{
      const mySecLevel = await getSecurityAccess(req.params.projectId, req.params.userId, req.params.userPSW);
      return res.send(mySecLevel);
    }
    catch (err){
      return res.send({status:701, msg:"System failure "+err});
    }
  }

  module.exports = {
    getUserPswRecord,
    getSecurityAccess,
    getSecurityLevel
  }