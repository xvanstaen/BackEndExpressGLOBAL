
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

/* ================ */

module.exports.getConfigServer = async function () {

   const myValue = await getConfigServer();
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

  //var searchString = undefined;
  var condition = searchString ? { bsearchString: { $regex: new RegExp(searchString), $options: "i" } } : {};
  try {
    const theValue = await CONFIG.find(condition);
    if (theValue.length!==0){
      testData=JSON.stringify(theValue);
      const record = JSON.parse(testData);
      cache.set(0, record[0]);
      cache.set(1, record[1]);

      //return ({status:200,config:data});
      console.log('cache of config data is set up; status=200');
      return ({status:200,configProd:record[0],configTest:record[1]});
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
    if (testProd==='prod'){
      testConfig=cache.get(0);
    } else {
      testConfig=cache.get(1);
    }
    for (var i=0; i<testConfig.filesToCache.length; i++){
        const theClass= {bucket:"",object:""};
        filesToCache.push(theClass);
        filesToCache[i].bucket=testConfig.filesToCache[i].bucket;
        filesToCache[i].object=testConfig.filesToCache[i].object;
    }

    return ({status:200, tab:filesToCache});
  } else {
    return ({status:501,mesage:'configData cache does not exist; pb when server was initialised'})
  }
}

getConfigServer  = async function () {
  /*
       current_dbName='ConfigDB';
       db.config.collection.collectionName='configServer';
       db.config.collection.name='configServer';
 */
       const mongoStatus = await accessMongo.accessMongo(CONFIG, dbName);
       try {
             return (mongoStatus)
             }
        catch (err) {
          console.log(err);
          return (err);
        }

  }

exports.resetConfig = (req, res) => {
  if ( cache.has(0)){
    cache.set(0, "");
    cache.set(1, "");
  }
  return res.status(200).send({message:"cache for configuration is reset"});
}

// Retrieve config from the database.
// const findCollection = async (req, res) => {
exports.findConfig = (req, res) => {
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

        var searchString = req.query.searchString;

        db.config.collection.collectionName=req.params.collection;
        db.config.collection.name=req.params.collection;

        var condition = searchString ? { searchString: { $regex: new RegExp(searchString), $options: "i" } } : {};

        accessMongo.accessMongo(CONFIG, dbName).then
        (result => {
          CONFIG.find(condition)
                .then(data => {
                  testData=JSON.stringify(data);
                  const record = JSON.parse(testData);
                  cache.set(0, record[0]); // prod
                  cache.set(1, record[1]); // test
                  //cache.set(0, data);
                  return res.send(data);
                })
                .catch(err => {
                      return res.status(500).send({ message:err.message || "Some error occurred while retrieving config"});
                });
          });
      }
}

// Update configServer by the id in the request
exports.updateConfig = (req, res) => {
  accessMongo.accessMongo(CONFIG, dbName);

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
exports.uploadConfig = (req, res) => {
  accessMongo.accessMongo(CONFIG, dbName);
  var configData=new CONFIG(req.body);
  const id='123456';
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

module.exports.getAllConfig  = (req, res) => {

  if (req.params.db!==''){
    current_dbName=req.params.db;
  }

  var searchString = req.query.searchString;

  db.config.collection.collectionName=req.params.collection;
  db.config.collection.name=req.params.collection;

  var condition = searchString ? { searchString: { $regex: new RegExp(searchString), $options: "i" } } : {};

  accessMongo.accessMongo(CONFIG, dbName).then
  (result => {
    CONFIG.find(condition)
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


