const express = require("express");
const router = express.Router();
const controller = require("../controllers/file.controller");
const tutorials =  require("../controllers/tutorial.controller.js");
let routes = (app) => {
  router.post("/upload", controller.upload);
  router.get("/files", controller.getListFiles);
  router.get("/files/:name", controller.download);
  router.get("/meta/:name", controller.downloadObjMeta);
  router.get("/lBucket", controller.listBuckets);


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


