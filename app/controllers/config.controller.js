
/* ================ */
const mongoose = require("mongoose");
mongoose.set('strictQuery', false);
mongoose.Promise = global.Promise;
const dbConfig = require("../config/db.config.js"); // contains the mongodb url
const db = {};
db.url = dbConfig.url;
db.mongoose = mongoose;
db.config = require("../models/config.model.js")(mongoose);
db.config.collection.name='configServer';
db.config.collection.collectionName='configServer';

const CONFIG = db.config;

const dbName='ConfigDB';
/* ================ */

const accessMongo = require("./accessMongo.js"); 

/* ================ */

const nodecache = require('node-cache');
var cache = new nodecache;


const fileController = require("./file.controller");
/* ================ */

module.exports.getConfigServer = async function () {

   const myValue = await retrieveConfigServer();
    try{
      console.log('ConfigServer = ' + JSON.stringify(myValue));
      return (myValue)
    }
    catch(err) {
      console.log('Error to access ConfigServer = ' + err);
      return (err)
    }
}

module.exports.getConfigData = async function (testProd, searchString) {

  var searchString = undefined;
  var condition = searchString ? { "test_prod": { $regex: new RegExp(searchString), $options: "i" } } : {};
  var i=0;
  try {
    const theValue = await CONFIG.find(condition); 
    if (theValue.length!==0){
      testData=JSON.stringify(theValue);
      const record = JSON.parse(testData);
      for (i=0; i<record.length; i++){
        cache.set(i, record[i]);
      }
      //cache.set(0, record[0]);
      //cache.set(1, record[1]);

      //return ({status:200,config:data});
      console.log('cache of config data is set up; status=200');
      return ({status:200,configProd:record[0],configTest:record[1], nbRecords:i});
    } else {
      console.log('pb to retrieve config data; status=510');
      return ({status:510,err:'problem to retrieve content of configDB'});
    }
  }
  catch (err) {
    console.log (' global error when retrieving config data, err='+err);
    return err
  }
}

module.exports.getFilesToCache = async function (testProd) {
  var filesToCache=[];
  var testConfig="";
  if ( cache.has(0)){ // should always be true
    if (testProd.toLowerCase()==='prod'){
      testConfig=cache.get(0);
    } else {
      testConfig=cache.get(1);
    }
    for (var i=0; i<testConfig.filesToCache.length; i++){
        const theClass= {bucket:"",object:""};
        filesToCache.push(theClass);
        if (testConfig.filesToCache[i].bucket!==undefined){
          filesToCache[i].bucket=testConfig.filesToCache[i].bucket;
          filesToCache[i].object=testConfig.filesToCache[i].object;
        } else {
          filesToCache[i].bucket="";
          filesToCache[i].object=testConfig.filesToCache[i];
        }   
    }
    return ({status:200, tab:filesToCache});
  } else {
    return ({status:501,mesage:'configData cache does not exist; pb when server was initialised'})
  }
}

retrieveConfigServer  = async function () {
  db.config.collection.collectionName=req.params.collection;
  db.config.collection.name=req.params.collection;
  const mongoStatus = await accessMongo.accessMongo(CONFIG, req.params.db);
    try {
      return (mongoStatus)
    }
    catch (err) {
      console.log(err);
      return (err);
    }
  }

exports.resetConfig = (req, res) => {
  var i=0;
  for (i=0; cache.has(i); i++){
    cache.set(i, "");
  }
  /*
  if ( cache.has(0)){
    cache.set(0, "");
    cache.set(1, "");
  }
  */
  return res.status(200).send({message:"cache for configuration (' + i ' records) is reset"});
}

// Retrieve config from the database.
// const findCollection = async (req, res) => {
exports.findConfig = async  (req, res) => {
  //console.log('findCollection/configServer');
  if ( cache.has(0) && cache.get(0)!==""){
    if (req.params.testProd==='prod'){
      var configServer=cache.get(0);
    } else {
      configServer=cache.get(1);
    }
      //console.log('configServer retrieved from cache(0)');
      return res.send(configServer);
  } else {
        if (req.params.db!==''){
          current_dbName=req.params.db;
        } 
        db.config.collection.collectionName=req.params.collection;
        db.config.collection.name=req.params.collection;
        await accessMongo.accessMongo(CONFIG, req.params.db);

        CONFIG.find()
            .then(data => {
                testData=JSON.stringify(data);
                const record = JSON.parse(testData);
                cache.set(0, record[0]); // prod
                cache.set(1, record[1]); // test
                return res.send(data);
            })
            .catch(err => {
                return res.status(500).send({ message:err.message || "Some error occurred while retrieving config"});
            });
      }
}

exports.findConfigBytring = async (req, res) => {
  //console.log('findCollection/configServer');
  var searchString = req.query.searchString;
  if (searchString!==undefined && searchString!=="" && req.params.searchField!=="Nil"){
    
  } else {
    return res.status(530).send({ message:"At least one search parameter (string and/or field) is invalid ", status:530});
  }
  var condition = searchString ? { [req.params.searchField]: { $regex: new RegExp(searchString), $options: "i" } } : {};    
  if (req.params.db!==''){
      current_dbName=req.params.db;
  }
  db.config.collection.collectionName=req.params.collection;
  db.config.collection.name=req.params.collection;
  await accessMongo.accessMongo(CONFIG, req.params.db);
  try{
      CONFIG.find(condition)
          .then(data => {
              return res.send(data);
          })
          .catch(err => {
              return res.status(500).send({ message:err.message || "Some error occurred while retrieving config"});
          });
  }
  catch(err) {
    return res.status(521).send({status:521, message:"FAILURE " + err.message});
  }; 

}

// Update configServer by the id in the request
exports.updateConfig = async (req, res) => {
  db.config.collection.collectionName=req.params.collection;
  db.config.collection.name=req.params.collection;
  await accessMongo.accessMongo(CONFIG, req.params.db);

  if (!req.body) {
      return res.status(400).send({
        message: "record is empty; cannot be updated"
      });
    }
    const id = req.params.id;
    CONFIG.findByIdAndUpdate(id, req.body, { useFindAndModify: false })
      .then(data => {

        if (!data) {
          return res.status(404).send({
            message: `Cannot update Config record with id=${id}. Maybe Config record was not found!`
          });
        } else return res.send({ message: "Config record was updated successfully." });
      })
      .catch(err => {
     
              return res.status(500).send({
                message: "Error updating Config record with id=" + id
              });
         
      });
};

// Save config
exports.uploadConfig = async (req, res) => {

  db.config.collection.collectionName=req.params.collection;
  db.config.collection.name=req.params.collection;
  await accessMongo.accessMongo(CONFIG, req.params.db);
  var configData=new CONFIG(req.body);
  configData.save()
    .then(data => {
      return res.status(200).send(data);
      })
    .catch(err => {
        return res.status(500).send({
            message:
            err.message || "Config record cannot be updated"
          });
      });

}

module.exports.getAllConfig  =  async (req, res) => {
  fileController.fillCacheConsole('in getAllConfig req.params.collection='+req.params.collection, " req.query.searchString=" + req.query.searchString);

  db.config.collection.collectionName=req.params.collection;
  db.config.collection.name=req.params.collection;
  
  await  accessMongo.accessMongo(CONFIG, req.params.db).then
  (result => {
    CONFIG.find()
          .then(data => {
            testData=JSON.stringify(data);
            const record = JSON.parse(testData);

            return res.send(record);
          })
          .catch(err => {
                return res.status(500).send({ message:err.message || "Some error occurred while retrieving config"});
          });
    });
  
}


