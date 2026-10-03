const express = require("express");
const router = express.Router();

const fileCtrl = require("../controllers/file.controller.js");
const tutorials =  require("../controllers/tutorial.controller.js");
const fileSystem =  require("../controllers/fileSystem.controller.js");
const authFn =  require("../controllers/authFn.js");
const cryptoFn =  require("../controllers/cryptoFn.js");
const config =  require("../controllers/config.controller.js");
const cacheFn =  require("../controllers/cacheFunctions.js");
const cacheConsole =  require("../controllers/cacheConsole.js");
const versionFn =  require("../controllers/versionServerFn.js");
const securityCtrl =  require("../controllers/securityCtrl.js");

let routes = (app) => {
  router.post("/upload/:userId/:userPSW/:projectId/:name/:testProd/:cacheControl/:contentType", fileCtrl.upload);
  router.post("/uploadFromMemory/:userId/:userPSW/:projectId/:name/:testProd/:cacheControl/:contentType", fileCtrl.uploadFromMemory);
  router.post("/uploadMetaPerso/:projectId/:name/:testProd/:cacheControl/:contentType/:metaPerso", fileCtrl.uploadMetaPerso);
  router.post("/updateMeta/:projectId/:testProd/:name/:metaCache/:metaType/:metaPerso", fileCtrl.updateMeta);
  router.get("/listFiles/:projectId/:testProd", fileCtrl.getListFiles);
  router.get("/filesmeta/:projectId/:testProd", fileCtrl.getListMetaDataFiles);
  router.get("/files/:userId/:userPSW/:projectId/:testProd/:name", fileCtrl.getFileContent);
  router.get("/textFile/:projectId/:testProd/:name", fileCtrl.getTextFile);
  router.get("/mediaLink/:userId/:userPSW/:projectId/:testProd/:name", fileCtrl.getMedialinkContent);

  router.get("/meta/:projectId/:testProd/:name", fileCtrl.getObjectMeta);
  router.get("/lBucket/:userId/:projectId/:testProd", fileCtrl.listBuckets);
  router.get("/delete/:userId/:projectId/:testProd/:name", fileCtrl.deleteObject);
  router.get("/rename/:userId/:projectId/:testProd/:SRCname/:DESTname", fileCtrl.renameObject);
  router.get("/move/:userId/:projectId/:testProd/:DESTbucket/:SRCname/:DESTname", fileCtrl.moveObject);
  router.get("/copy/:userId/:projectId/:testProd/:DESTbucket/:SRCname/:DESTname", fileCtrl.copyObject);

  router.get("/resetCacheFile/:userId/:projectId/:testProd/:fileName", cacheFn.resetCacheFile);
  router.get("/getCacheFile/:userId/:projectId/:testProd", cacheFn.getCacheFile);
  router.get("/reloadCacheFile/:userId/:projectId/:testProd", cacheFn.reloadCacheFile);
  router.get("/insertCacheFile/:userId/:projectId/:testProd/:name", cacheFn.insertCacheFile);

  router.get("/getCacheConsole/:userId/:projectId/:testProd", cacheConsole.getCacheConsole);
  router.get("/resetCacheConsole/:userId/:projectId/:testProd", cacheConsole.resetCacheConsole);
  router.get("/disableCacheConsole/:userId/:projectId/:testProd", cacheConsole.disableCacheConsole);
  router.get("/enableCacheConsole/:userId/:projectId/:testProd", cacheConsole.enableCacheConsole);

  router.get("/serverVersion/:projectId/:testProd", versionFn.getServerVersion);

  router.get("/checkLogin/:projectId/:testProd/:userId", fileCtrl.checkLogin);

  router.get("/encryptFn/:userId/:projectId/:testProd/:inKey/:inMethod/:iFour/:inAuth", cryptoFn.encryptFn);
  router.get("/decryptFn/:userId/:projectId/:testProd/:inKey/:inMethod/:iFour/:inAuth", cryptoFn.decryptFn);

  router.get("/encryptAllFn/:projectId/:testProd/:inKey/:inMethod/:iFour/:inAuth", cryptoFn.encryptFnAll);
  router.get("/decryptAllFn/:projectId/:testProd/:inKey/:inMethod/:iFour/:inAuth", cryptoFn.decryptFnAll);
  router.get("/encryptPSW/:projectId/:testProd/:inKey/:inMethod/:iFour/:inAuth", cryptoFn.encryptPSW);
  router.get("/decryptPSW/:projectId/:testProd/:inKey/:inMethod/:iFour/:inAuth", cryptoFn.decryptPSW);

  router.get("/fillCacheCrypto/:projectId/:testProd/:cryptoCacheType/:cryptoCacheFile", cryptoFn.fillCacheCrypto);

  router.get("/requestTokenOAuth2/:projectId/:testProd", authFn.requestTokenOAuth2);
  router.get("/refreshToken/:projectId/:testProd", authFn.refreshToken);
  router.get("/revokeToken/:projectId/:testProd", authFn.revokeToken);
  router.get("/checkAccessToken/:projectId/:testProd/:accessToken", authFn.checkAccessToken);
  
  router.get("/getCredentials/:projectId/:testProd/:reset", authFn.getCredentials);
  router.get("/requestDefaultCredentials/:projectId/:testProd/:reset", authFn.getDefaultCredentials);
  router.get("/getNewServerUsrId/:projectId/:testProd", authFn.getNewServerUsrId);

  router.get("/onFileSystem/:projectId/:testProd/:name/:iWait", fileSystem.onFileSystem);
  //router.get("/onFileSystem/:projectId/:testProd/:server/:name/:tabLock/:iWait", fileSystem.onFileSystem);
  router.get("/resetFS/:userId/:projectId/:testProd/:name/:iWait", fileSystem.resetFS);
  router.get("/memoryFS/:userId/:projectId/:testProd/", fileSystem.getMemoryFS);
  //router.get("/credentialsFS/:projectId/:testProd", fileSystem.getFSCredentials);

  router.get("/getSecurity/:userId/:projectId/:testProd", securityCtrl.getSecurityLevel);

  
/*============ CONFIG  =============*/
  // Retrieve configServer file

  router.get("/findConfig/:db/:testProd/:collection", config.findConfig);
  router.get("/findConfigByString/:db/:testProd/:collection/:searchField", config.findConfig); // contains the searchString query
  router.get("/resetConfig/:userId/:userPSW/:db/:testProd/:collection", config.resetCacheConfig);
  router.get("/findAllConfig/:db/:testProd/:collection", config.getAllConfig);
  router.put("/updateConfig/:userId/:userPSW/:db/:testProd/:collection/:id", config.updateConfig);
  router.put("/uploadConfig/:userId/:userPSW/:db/:testProd/:collection", config.uploadConfig);
  router.get("/delConfigById/:userId/:userPSW/:db/:testProd/:collection/:id", config.delConfigById);


/*============ TUTORIALS =============*/

  // Find by ?
  router.get("/findTutByString/:userId/:userPSW/:db/:testProd/:collection/:fieldSearch", tutorials.findByCriteria); // contains the searchString query
  // Retrieve all records
  router.get("/findTutAll/:userId/:userPSW/:db/:testProd/:collection", tutorials.findAll);
  // Retrieve a single record with id
  router.get("/findTutById/:userId/:userPSW/:db/:testProd/:collection/:id", tutorials.findById);
  // Save a new record
  router.put("/uploadTut/:userId/:userPSW/:db/:testProd/:collection",  tutorials.save);
  // Update a record with id
  router.put("/updateTut/:userId/:userPSW/:db/:testProd/:collection/:id", tutorials.update);
  // Delete a record with id
  router.get("/deleteTut/:userId/:userPSW/:db/:testProd/:collection/:id", tutorials.deleteById);
  // Delete a record with string
  router.get("/deleteTutByString/:userId/:userPSW/:db/:testProd/:collection/:fieldSearch", tutorials.deleteByString); // contains the searchString query
  // Delete all records
  router.get("/deleteAllTut/:userId/:userPSW/:db/:testProd/:collection", tutorials.deleteAll);



  app.use(router);
};
module.exports = routes;


