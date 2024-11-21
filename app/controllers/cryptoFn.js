
const { MAX_RETRY_DEFAULT } = require("@google-cloud/storage/build/src/storage");
const CryptoJS = require ('crypto-js');
//const fileController = require("./file.controller");
//const securityCtrl = require("./securityCtrl.js");
const authFn = require("./authFn");
const nodecache = require('node-cache');
var cachePSW = new nodecache;
var cacheAll = new nodecache;
var bucketCrypto='xmv-cryptodata';
//var bucketLogin='manage-login';

const  fillCacheCrypto = async (req, res) => {
  try {
    if (req.params.cryptoCacheType==="PSW"){
      if ( cachePSW.has(0)){
        return res.send({status:210, msg:"Cache Crypto was already filled-in"});
      } else {
        cachePSW.set(0,JSON.parse(req.params.cryptoCacheFile));
      }
      
    } else if (req.params.cryptoCacheType==="All"){
      if ( cacheAll.has(0)){
        return res.send({status:210, msg:"Cache Crypto was already filled-in"});
      } else {
        cacheAll.set(0,JSON.parse(req.params.cryptoCacheFile));
      }
    }
    return res.send({status:200, msg:"Cache Crypto filled"});
  }        
  catch (err){
    return res.status(700).send({msg:"Cache Crypto could not be filled"});
  }
}

const  encryptFn = async (req, res) => {
  
  try {
    // decode PSW
    const thePSW = await getDecrypt(req.params.userPSW,req.params.inKey, req.params.inMethod, req.params.iFour, req.params.projectId)

    const securityLevel= await securityCtrl.getSecurityAccess(req.params.userId,thePSW);
    if (securityLevel.status!==200){
      return res.send(securityLevel);
    } 
    if (securityLevel.accessLevel!=='Very High'){
      return res.send({status:585,msg:"you don't have the permission to use this functionality"});
    }
    const cryptAuth = JSON.parse(req.params.inAuth);
    if (cryptAuth.userId !== undefined && cryptAuth.psw !== undefined && cryptAuth.crypto !== undefined){
        if (cryptAuth.crypto === true){  
          const encrypt = await getEncrypt(req.params.inData, req.params.inKey, req.params.inMethod, 1, req.params.projectId) ;
          return res.send({response:encrypt});
        } 
        return res.status(702).send({error:"invalid encrypt request"});
    } 
    return res.status(702).send({error:"invalid encrypt request"});  
  }
  catch (err){
    return res.status(700).send({msg:'pb with  coding of encryptFn', error:err});
  }
}

const  decryptFn = async (req, res) => {
  try {
    
    const securityLevel= await securityCtrl.getSecurityAccess(req.params.userId,req.params.userPSW);
    if (securityLevel.status!==200){
      return res.send(securityLevel);
    } 
    if (securityLevel.accessLevel!=='Very High'){
      return res.send({status:585,msg:"you don't have the permission to use this functionality"});
    }
    const cryptAuth = JSON.parse(req.params.inAuth);
    if (cryptAuth.userId !== undefined && cryptAuth.psw !== undefined && cryptAuth.crypto !== undefined){
      if (cryptAuth.crypto === true){  
          const decrypt = await getDecrypt(req.params.inData, req.params.inKey, req.params.inMethod, req.params.iFour, req.params.projectId);
          return res.send({response:decrypt});

      } 
      return res.status(702).send({error:"invalid decrypt request"});
    } 
    return res.status(702).send({error:"invalid decrypt request"});
    }
    catch (err){
      return res.status(700).send({msg:'pb with coding of decryptFn', error:err});
    }
}

  const  encryptPSW = async (req, res) => {
    try {

      const encrypt = await getEncrypt(req.params.inData, req.params.inKey, req.params.inMethod, req.params.iFour, req.params.projectId) ;
      return res.send({response:encrypt});
  
    } 
    catch (err){
      return res.status(700).send({status:700, msg:'pb with  coding of encryptFn'+err});
    }
  }

  const  decryptPSW = async (req, res) => {
    try {
      const decrypt = await getDecrypt(req.params.inData, req.params.inKey, req.params.inMethod, req.params.iFour, req.params.projectId);
      return res.send({response:decrypt});
    }
    catch (err){
      return res.status(700).send({sttaus:700,msg:'pb with coding of decryptFn'+err});
    }
  }

  async function getEncrypt(Decrypt, key, method, i_theFour, projectId){
      if ( cachePSW.has(0)){
        var myCrypto=cachePSW.get(0);
      } else {
            const storage = await authFn.getClient(projectId);
            const bucket = storage.bucket(bucketCrypto);
            const [downloadFile] = await bucket.file('cryptoKey').download();
            cachePSW.set(0,JSON.parse(downloadFile))
            myCrypto=JSON.parse(downloadFile);
      }
    if (key > 0 && key -1 <myCrypto.tab.length){
        var myKey=myCrypto.tab[key-1].theKey;
    } else {
      Encrypt='Key invalid';
      return(Encrypt);
    }
    const IV = myCrypto.theFour[i_theFour]; 
    const keyHex = CryptoJS.enc.Utf8.parse(myKey);
    const iv = CryptoJS.enc.Utf8.parse(IV);
    const mode = CryptoJS.mode.CBC;
    var Encrypt='';
    if (method==='DES'){
        // ==== DES
      Encrypt = CryptoJS.TripleDES.encrypt(Decrypt, keyHex, { iv, mode }).toString();
      } else if (method==='AES'){
            // ==== AES
            Encrypt=CryptoJS.AES.encrypt(Decrypt, myKey).toString();
            } 
           //console.log('Encrypt function: decrypt ', Decrypt, 'Method  ', method, 'encrypt', Encrypt);
      return(Encrypt);
  }
  
  
  async function getDecrypt(Encrypt, key, method, i_theFour, projectId){
    
      if ( cachePSW.has(0)){
        var myCrypto=cachePSW.get(0);
      } else {
            const storage = await authFn.getClient(projectId);
            const bucket = storage.bucket(bucketCrypto);
            const [downloadFile] = await bucket.file('cryptoKey').download();
            cachePSW.set(0,JSON.parse(downloadFile))
            myCrypto=JSON.parse(downloadFile);
      }
  
    if (key > 0 && key -1 <myCrypto.tab.length){
      var myKey=myCrypto.tab[key-1].theKey;
    } else {
      Decrypt='Key invalid';
      return(Decrypt);
    }
    const IV = myCrypto.theFour[i_theFour]; 
    const keyHex = CryptoJS.enc.Utf8.parse(myKey);
    const iv = CryptoJS.enc.Utf8.parse(IV);
    const mode = CryptoJS.mode.CBC;
    var Decrypt='';
    if (method==='DES'){
      // ==== DES
      Decrypt = CryptoJS.TripleDES.decrypt(Encrypt, keyHex, { iv, mode }).toString(CryptoJS.enc.Utf8);
    } else if (method==='AES'){
          // ==== AES
          Decrypt=CryptoJS.AES.decrypt(Encrypt, myKey).toString(CryptoJS.enc.Utf8);
          } 
          //console.log('Decrypt function: decrypt ', Decrypt, 'Method  ', method, 'encrypt', Encrypt);
    return(Decrypt); 
  }

    // =============== CRYPTO FOR ALL =================

const  encryptFnAll = async (req, res) => {
  
  try {

    const encrypt = await getEncryptAll(req.params.inData, req.params.inKey, req.params.inMethod, req.params.iFour, req.params.projectId) ;
    return res.send({response:encrypt});

  } 
  catch (err){
    return res.status(700).send({status:700, msg:'pb with  coding of encryptFn'+err});
  }
}

const  decryptFnAll = async (req, res) => {
  try {
    const decrypt = await getDecryptAll(req.params.inData, req.params.inKey, req.params.inMethod, req.params.iFour, req.params.projectId);
    return res.send({response:decrypt});
  }
  catch (err){
    return res.status(700).send({status:700,msg:'pb with coding of decryptFn'+err});
  }
}
  async function getEncryptAll(Decrypt, key, method, i_theFour, projectId){
    if ( cacheAll.has(0)){
      var myCrypto=cacheAll.get(0);
    } else {
          const storage = await authFn.getClient(projectId);
          const bucket = storage.bucket(bucketCrypto);
          const [downloadFile] = await bucket.file('cryptoForAll').download();
          cacheAll.set(0,JSON.parse(downloadFile))
          myCrypto=JSON.parse(downloadFile);
    }
  if (key > 0 && key - 1 <myCrypto.tab.length){
      var myKey=myCrypto.tab[key-1].theKey;
  } else {
    Encrypt='Key invalid';
    return(Encrypt);
  }
  const IV = myCrypto.theFour[i_theFour]; 
  const keyHex = CryptoJS.enc.Utf8.parse(myKey);
  const iv = CryptoJS.enc.Utf8.parse(IV);
  const mode = CryptoJS.mode.CBC;
  var Encrypt='';
  if (method==='DES'){
      // ==== DES
    Encrypt = CryptoJS.TripleDES.encrypt(Decrypt, keyHex, { iv, mode }).toString();
    } else if (method==='AES'){
          // ==== AES
          Encrypt=CryptoJS.AES.encrypt(Decrypt, myKey).toString();
          } 
         //console.log('Encrypt function: decrypt ', Decrypt, 'Method  ', method, 'encrypt', Encrypt);
    return(Encrypt);
}


async function getDecryptAll(Encrypt, key, method, i_theFour, projectId){
  
      if ( cacheAll.has(0)){
      var myCrypto=cacheAll.get(0);
    } else {
          const storage = await authFn.getClient(projectId);
          const bucket = storage.bucket(bucketCrypto);
          const [downloadFile] = await bucket.file('cryptoForAll').download();
          cacheAll.set(0,JSON.parse(downloadFile))
          myCrypto=JSON.parse(downloadFile);
    }

  if (key > 0 && key-1 <myCrypto.tab.length){
    var myKey=myCrypto.tab[key-1].theKey;
  } else {
    Decrypt='Key invalid';
    return(Decrypt);
  }
  const IV = myCrypto.theFour[i_theFour]; 
  const keyHex = CryptoJS.enc.Utf8.parse(myKey);
  const iv = CryptoJS.enc.Utf8.parse(IV);
  const mode = CryptoJS.mode.CBC;
  var Decrypt='';
  if (method==='DES'){
    // ==== DES
    Decrypt = CryptoJS.TripleDES.decrypt(Encrypt, keyHex, { iv, mode }).toString(CryptoJS.enc.Utf8);
  } else if (method==='AES'){
        // ==== AES
        Decrypt=CryptoJS.AES.decrypt(Encrypt, myKey).toString(CryptoJS.enc.Utf8);
        } 
        //console.log('Decrypt function: decrypt ', Decrypt, 'Method  ', method, 'encrypt', Encrypt);
  return(Decrypt); 
}

  module.exports = {
  encryptFn,
  decryptFn,
  encryptPSW,
  decryptPSW,
  getDecrypt,
  getEncrypt,
  encryptFnAll,
  decryptFnAll,
  getDecryptAll,
  getEncryptAll,
  fillCacheCrypto
  }