
const { MAX_RETRY_DEFAULT } = require("@google-cloud/storage/build/src/storage");
const CryptoJS = require ('crypto-js');
const fileController = require("./file.controller");
const authFn = require("./authFn");
const nodecache = require('node-cache');
var cache = new nodecache;
var cryptoBucket='xmv-cryptodata';

const  encryptFn = async (req, res) => {
    try {
      const cryptAuth = JSON.parse(req.params.inAuth);
      if (cryptAuth.userId !== undefined && cryptAuth.psw !== undefined && cryptAuth.crypto !== undefined){
          if (cryptAuth.crypto === true){  
            const myDecrypt = await fileController.getUserPswRecord(req.params.projectId,cryptAuth.userId, req.params.userId );
              if (myDecrypt.data === "Key invalid" || myDecrypt.data !== cryptAuth.psw){
                    res.status(701).send({error:"invalid request"});
              } else {
                const encrypt = await getEncrypt(req.params.inData, req.params.inKey, req.params.inMethod, 0, req.params.projectId) ;
                res.send({response:encrypt});
              } 
          } else {
            res.status(702).send({error:"invalid request"});
          }
      } else {
          res.status(702).send({error:"invalid request"});
        }
    }
    catch (err){
      res.status(700).send('pb with encryptFn');
    }
  }
  
  const  decryptFn = async (req, res) => {
    try {
      const cryptAuth = JSON.parse(req.params.inAuth);
      if (cryptAuth.userId !== undefined && cryptAuth.psw !== undefined && cryptAuth.crypto !== undefined){
        if (cryptAuth.crypto === true){  
            const myEncrypt = await fileController.getUserPswRecord(req.params.projectId,cryptAuth.userId, req.params.userId );
            if (myEncrypt.data === "Key invalid" || myEncrypt.data !== cryptAuth.psw){
                  res.status(701).send({error:"invalid request"});
            } else {
              const decrypt = await getDecrypt(req.params.inData, req.params.inKey, req.params.inMethod, 0, req.params.projectId);
              res.send({response:decrypt});
            }
        } else {
            res.status(702).send({error:"invalid request"});
        }
      } else {
          res.status(702).send({error:"invalid request"});
      }
      }
      catch (err){
        res.status(700).send('pb with decryptFn');
      }
  }
  
  async function getEncrypt(Decrypt, key, method, i_theFour, projectId){
      if ( cache.has(0)){
        var myCrypto=cache.get(0);
      } else {
            const storage = await authFn.getClient(projectId);
            const bucket = storage.bucket(cryptoBucket);
            const [downloadFile] = await bucket.file('cryptoKey').download();
            cache.set(0,JSON.parse(downloadFile))
            myCrypto=JSON.parse(downloadFile);
      }
    if (key > -1 && key <myCrypto.tab.length){
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
    
      if ( cache.has(0)){
        var myCrypto=cache.get(0);
      } else {
            const storage = await authFn.getClient(projectId);
            const bucket = storage.bucket(cryptoBucket);
            const [downloadFile] = await bucket.file('cryptoKey').download();
            cache.set(0,JSON.parse(downloadFile))
            myCrypto=JSON.parse(downloadFile);
      }
  
    if (key > -1 && key <myCrypto.tab.length){
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
  getDecrypt,
  getEncrypt
  }