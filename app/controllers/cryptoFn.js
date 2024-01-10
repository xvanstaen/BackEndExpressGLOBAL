
const { MAX_RETRY_DEFAULT } = require("@google-cloud/storage/build/src/storage");
const CryptoJS = require ('crypto-js');
const fileController = require("./file.controller");
const authFn = require("./authFn");
const nodecache = require('node-cache');
var cache = new nodecache;
var bucketCrypto='xmv-cryptodata';
var bucketLogin='manage-login';

const  encryptFn = async (req, res) => {
    try {
      const cryptAuth = JSON.parse(req.params.inAuth);
      if (cryptAuth.userId !== undefined && cryptAuth.psw !== undefined && cryptAuth.crypto !== undefined){
          if (cryptAuth.crypto === true){  
            const encrypt = await getEncrypt(req.params.inData, req.params.inKey, req.params.inMethod, 0, req.params.projectId) ;
            res.send({response:encrypt});
            /*
            const storage = await authFn.getClient(projectId);
            var bucket = storage.bucket(bucketLogin);
            bucket.projectId=projectId;
          
            const [downloadFile] = await bucket.file(userId+'PSW.json').download();
            const decrypt = await getDecrypt(JSON.parse(downloadFile).psw , JSON.parse(downloadFile).key, JSON.parse(downloadFile).method ,0, projectId)
           
              if (decrypt === "Key invalid" || decrypt !== cryptAuth.psw){
                    res.status(701).send({error:"invalid request"});
              } else {
                const encrypt = await getEncrypt(req.params.inData, req.params.inKey, req.params.inMethod, 0, req.params.projectId) ;
                res.send({response:encrypt});
              } 
              */
          } else {
            res.status(702).send({error:"invalid encrypt request"});
          }
      } else {
          res.status(702).send({error:"invalid encrypt request"});
        }
    }
    catch (err){
      res.status(700).send({msg:'pb with  coding of encryptFn', error:err});
    }
  }
  
  const  decryptFn = async (req, res) => {
    try {
      const cryptAuth = JSON.parse(req.params.inAuth);
      if (cryptAuth.userId !== undefined && cryptAuth.psw !== undefined && cryptAuth.crypto !== undefined){
        if (cryptAuth.crypto === true){  
            const decrypt = await getDecrypt(req.params.inData, req.params.inKey, req.params.inMethod, 0, req.params.projectId);
            res.send({response:decrypt});
            /*
            //const [downloadFile] = await bucket.file(cryptAuth.userId+'PSW.json').download();
            //const myEncrypt = await getDecrypt(JSON.parse(downloadFile).psw , JSON.parse(downloadFile).key, JSON.parse(downloadFile).method ,0, projectId)
            const myEncrypt = await getDecrypt(cryptAuth.psw  , cryptAuth.key , JSON.parse(downloadFile).method ,0, projectId)
            if (myEncrypt === "Key invalid" || myEncrypt !== cryptAuth.psw){
                  res.status(701).send({error:"invalid request"});
            } else {
              const decrypt = await getDecrypt(req.params.inData, req.params.inKey, req.params.inMethod, 0, req.params.projectId);
              res.send({response:decrypt});
            }
            */
        } else {
            res.status(702).send({error:"invalid decrypt request"});
        }
      } else {
          res.status(702).send({error:"invalid decrypt request"});
      }
      }
      catch (err){
        res.status(700).send({msg:'pb with coding of decryptFn', error:err});
      }
  }
  
  async function getEncrypt(Decrypt, key, method, i_theFour, projectId){
      if ( cache.has(0)){
        var myCrypto=cache.get(0);
      } else {
            const storage = await authFn.getClient(projectId);
            const bucket = storage.bucket(bucketCrypto);
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
            const bucket = storage.bucket(bucketCrypto);
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