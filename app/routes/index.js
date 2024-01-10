const express = require("express");
const router = express.Router();

const fileCtrl = require("../controllers/file.controller.js");
const tutorials =  require("../controllers/tutorial.controller.js");
const fileSystem =  require("../controllers/fileSystem.controller.js");
const authFn =  require("../controllers/authFn.js");
const cryptoFn =  require("../controllers/cryptoFn.js");
const config =  require("../controllers/config.controller.js");
const cacheFn =  require("../controllers/cacheFunctions.js");

let routes = (app) => {
  router.post("/upload/:projectId/:name/:testProd/:cacheControl/:contentType", fileCtrl.upload);
  router.post("/uploadMetaPerso/:projectId/:name/:testProd/:cacheControl/:contentType/:metaPerso", fileCtrl.uploadMetaPerso);
  router.post("/updateMeta/:projectId/:testProd/:name/:metaCache/:metaType/:metaPerso", fileCtrl.updateMeta);
  router.get("/listFiles/:projectId/:testProd", fileCtrl.getListFiles);
  router.get("/filesmeta/:projectId/:testProd", fileCtrl.getListMetaDataFiles);
  router.get("/files/:projectId/:testProd/:name", fileCtrl.getFileContent);
  router.get("/textFile/:projectId/:testProd/:name", fileCtrl.getTextFile);
  router.get("/mediaLink/:projectId/:testProd/:name", fileCtrl.getMedialinkContent);

  router.get("/meta/:projectId/:testProd/:name", fileCtrl.getObjectMeta);
  router.get("/lBucket/:projectId/:testProd", fileCtrl.listBuckets);
  router.get("/delete/:projectId/:testProd/:name", fileCtrl.deleteObject);
  router.get("/rename/:projectId/:testProd/:SRCname/:DESTname", fileCtrl.renameObject);
  router.get("/move/:projectId/:testProd/:DESTbucket/:SRCname/:DESTname", fileCtrl.moveObject);
  router.get("/copy/:projectId/:testProd/:DESTbucket/:SRCname/:DESTname", fileCtrl.copyObject);

  router.get("/resetCacheFile/:projectId/:testProd/:fileName", cacheFn.resetCacheFile);
  router.get("/getCacheFile/:projectId/:testProd", cacheFn.getCacheFile);
  router.get("/reloadCacheFile/:projectId/:testProd", cacheFn.reloadCacheFile);
  router.get("/insertCacheFile/:projectId/:testProd/:name", cacheFn.insertCacheFile);

  router.get("/getCacheConsole/:projectId/:testProd", cacheFn.getCacheConsole);
  router.get("/resetCacheConsole/:projectId/:testProd", cacheFn.resetCacheConsole);

  router.get("/serverVersion/:projectId/:testProd", cacheFn.getServerVersion);

  router.get("/checkLogin/:projectId/:testProd/:userId/:psw/", fileCtrl.checkLogin);

  router.get("/encryptFn/:projectId/:testProd/:inData/:inKey/:inMethod/:inAuth", cryptoFn.encryptFn);
  router.get("/decryptFn/:projectId/:testProd/:inData/:inKey/:inMethod/:inAuth", cryptoFn.decryptFn);

  router.get("/requestDefaultCredentials/:projectId/:testProd", authFn.requestDefaultCredentials);
  router.get("/requestTokenOAuth2/:projectId/:testProd", authFn.requestTokenOAuth2);
  router.get("/refreshToken/:projectId/:testProd", authFn.refreshToken);
  router.get("/revokeToken/:projectId/:testProd", authFn.revokeToken);
  router.get("/checkAccessToken/:projectId/:testProd/:accessToken", authFn.checkAccessToken);
  router.get("/getCredentials/:projectId/:testProd/:name", authFn.getCredentials);
  router.get("/getNewServerUsrId/:projectId/:testProd", authFn.getNewServerUsrId);

  router.get("/onFileSystem/:projectId/:testProd/:name/:tabLock/:iWait", fileSystem.onFileSystem);
  router.get("/resetFS/:projectId/:testProd/:name/:tabLock/:iWait", fileSystem.resetFS);
  router.get("/memoryFS/:projectId/:testProd", fileSystem.getMemoryFS);
  
/*============ CONFIG  =============*/
  // Retrieve configServer file

  router.get("/config/:db/:testProd/:collection", config.findConfig);
  router.get("/configByString/:db/:testProd/:collection/:searchField", config.findConfig); // contains the searchString query
  router.get("/resetConfig/:db/:testProd/:collection", config.resetConfig);
  router.get("/allConfig/:db/:testProd/:collection", config.getAllConfig);
  router.put("/updateConfig/:db/:testProd/:collection/:id", config.updateConfig);
  router.put("/uploadConfig/:db/:testProd/:collection", config.uploadConfig);
  router.get("/delConfigById/:db/:testProd/:collection/:id", config.delConfigById);


/*============ TUTORIALS =============*/

  // Find by ?
  router.get("/findTutByString/:db/:testProd/:collection/:fieldSearch", tutorials.findByCriteria); // contains the searchString query
  // Retrieve all records
  router.get("/findTutAll/:db/:testProd/:collection", tutorials.findAll);
  // Retrieve a single record with id
  router.get("/findTutById/:db/:testProd/:collection/:id", tutorials.findById);
  // Save a new record
  router.put("/uploadTut/:db/:testProd/:collection",  tutorials.save);
  // Update a record with id
  router.put("/updateTut/:db/:testProd/:collection/:id", tutorials.update);
  // Delete a record with id
  router.get("/deleteTut/:db/:testProd/:collection/:id", tutorials.deleteById);
  // Delete a record with string
  router.get("/deleteTutByString/:db/:testProd/:collection/:fieldSearch", tutorials.deleteByString); // contains the searchString query
  // Delete all records
  router.get("/deleteAllTut/:db/:testProd/:collection", tutorials.deleteAll);



  app.use(router);
};
module.exports = routes;


