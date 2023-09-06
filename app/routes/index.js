const express = require("express");
const router = express.Router();

const controller = require("../controllers/file.controller.js");
//const mongoConfig =  require("../controllers/config.controller.js");
const tutorials =  require("../controllers/tutorial.controller.js");
const fileSystem =  require("../controllers/fileSystem.controller.js");
const authFn =  require("../controllers/authFn.js");
const cryptoFn =  require("../controllers/cryptoFn.js");

let routes = (app) => {
  router.post("/upload/:projectId/:testProd/:cacheControl/:contentType", controller.upload);
  router.post("/updateMeta/:projectId/:testProd/:name/:newMetaData", controller.updateMeta);
  router.get("/listFiles/:projectId/:testProd", controller.getListFiles);
  router.get("/filesmeta/:projectId/:testProd", controller.getListMetaDataFiles);
  router.get("/files/:projectId/:testProd/:name", controller.getFileContent);
  router.get("/meta/:projectId/:testProd/:name", controller.getObjectMeta);
  router.get("/lBucket/:projectId/:testProd", controller.listBuckets);
  router.get("/delete/:projectId/:testProd/:name", controller.deleteObject);
  router.get("/rename/:projectId/:testProd/:SRCname/:DESTname", controller.renameObject);
  router.get("/move/:projectId/:testProd/:DESTbucket/:SRCname/:DESTname", controller.moveObject);
  router.get("/copy/:projectId/:testProd/:DESTbucket/:SRCname/:DESTname", controller.copyObject);

  router.get("/resetCacheFile/:projectId/:testProd", controller.resetCacheFile);

  router.get("/checkLogin/:projectId/:testProd/:userId/:psw/", controller.checkLogin);

  router.get("/encryptFn/:projectId/:testProd/:inData/:inKey/:inMethod/:inAuth", cryptoFn.encryptFn);
  router.get("/decryptFn/:projectId/:testProd/:inData/:inKey/:inMethod/:inAuth", cryptoFn.decryptFn);

  router.get("/requestDefaultCredentials/:projectId/:testProd", authFn.requestDefaultCredentials);
  router.get("/requestTokenOAuth2/:projectId/:testProd", authFn.requestTokenOAuth2);
  router.get("/refreshToken/:projectId/:testProd", authFn.refreshToken);
  router.get("/revokeToken/:projectId/:testProd", authFn.revokeToken);
  router.get("/checkAccessToken/:projectId/:testProd/:accessToken", authFn.checkAccessToken);
  router.get("/getCredentials/:projectId/:testProd/:name", authFn.getCredentials);


  router.get("/onFileSystem/:projectId/:testProd/:name/:tabLock/:iWait", fileSystem.onFileSystem);

  
/*============ CONFIG  =============*/
  // Retrieve configServer file

  //router.get("//", tutorials.getConfigServer);
  router.get("/config/:db/:testProd/:collection", tutorials.findConfig);



/*============ TUTORIALS =============*/
  // Retrieve all Tutorials
  router.get("/tuto", tutorials.findByTitle);

  // Create a new Tutorial
  router.post("/tuto",  tutorials.insert);

  // Retrieve all published Tutorials
  router.get("/published", tutorials.findAllPublished);
  // Retrieve a single Tutorial with id
  router.get("/:id", tutorials.findOne);
  // Update a Tutorial with id
  router.put("/:id", tutorials.update);
  // Delete a Tutorial with id
  router.delete("/:id", tutorials.delete);
  // Create a new Tutorial
  router.delete("/", tutorials.deleteAll);
  //app.use('/api/tutorials', router);


  app.use(router);
};
module.exports = routes;


