const express = require("express");
const router = express.Router();
const controller = require("../controllers/file.controller");
const tutorials =  require("../controllers/tutorial.controller.js");
//const configs =  require("../controllers/config.controller.js");
let routes = (app) => {
  router.post("/upload/:projectId/:cacheControl/:contentType", controller.upload);
  router.post("/updateMeta/:projectId/:name", controller.updateMeta);
  router.get("/files/:projectId", controller.getListFiles);
  router.get("/filesmeta/:projectId", controller.getListMetaDataFiles);
  router.get("/files/:projectId/:name", controller.download);
  router.get("/meta/:projectId/:name", controller.downloadObjMeta);
  router.get("/lBucket/:projectId", controller.listBuckets);
  router.get("/delete/:projectId/:name", controller.deleteObject);
  router.get("/rename/:projectId/:SRCname/:DESTname", controller.renameObject);

/*============ CONFIG  =============*/
  // Retrieve configServer file
  ////router.get("/config/:db/:collection", configs.findCollection);
  router.get("/config/:db/:collection", tutorials.findCollection);

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


