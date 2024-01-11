
/* ================ */
const mongoose = require("mongoose");
mongoose.set('strictQuery', false);
mongoose.Promise = global.Promise;
const dbConfig = require("../config/db.config.js"); // contains the mongodb url


var dbConf = {};
//dbConf.url = dbConfig.url;
//dbConf.mongoose = mongoose;
dbConf.config = require("../models/config.model")(mongoose);
dbConf.config.collection.name='configServer';
dbConf.config.collection.collectionName='configServer';

const CONFIG = dbConf.config;
const dbName='ConfigDB';

/* ================ */

const accessMongo = require("./accessMongo.js"); 
const cacheConsole = require("./cacheConsole.js");

/* ================ */

const nodecache = require('node-cache');
var cacheConfig = new nodecache;


/* ================ */
function getConfigDB() {
  return ({theDB:CONFIG, dbName:dbName}); 
}


const getConfigServer = async function () {
  try{
      const myValue =await retrieveConfigServer();
    
      console.log('ConfigServer = ' + JSON.stringify(myValue));
      return (myValue)
  }
  catch(err) {
      console.log('Error to access ConfigServer = ' + err);
      return (err)
  }
}

const getConfigData = async function (testProd, searchString) {

  var searchString = undefined;
  var condition = searchString ? { "test_prod": { $regex: new RegExp(searchString), $options: "i" } } : {};
  var i=0;
  try {
    const theValue = await CONFIG.find(condition); 
    if (theValue.length!==0){
      testData=JSON.stringify(theValue);
      const record = JSON.parse(testData);
      for (i=0; i<record.length; i++){
        cacheConfig.set(i, record[i]);
      }
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


const retrieveConfigServer  = async function () {

  const mongoStatus = await accessMongo.accessMongo(CONFIG, dbName);
    try {
      return (mongoStatus)
    }
    catch (err) {
      console.log(err);
      return (err);
    }
  }


const getFilesToCache = async function (testProd) {
  try{
    var filesToCache=[];
    var testConfig="";
    if ( cacheConfig.has(0)){ // should always be true
      if (testProd.toLowerCase()==='prod'){
        testConfig=cacheConfig.get(0);
      } else {
        testConfig=cacheConfig.get(1);
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
  catch(err) {
    return res.status(521).send({status:521, message:"FAILURE " + err.message});
  }; 
}

const resetCacheConfig = (req, res) => {
  try{
    var i=0;
    for (i=0; cacheConfig.has(i); i++){
      cacheConfig.set(i, "");
    }

    return res.status(200).send({message:"cache for configuration (' + i ' records) is reset"});
  }
  catch(err) {
    return res.status(521).send({status:521, message:"FAILURE " + err.message});
  }; 
}

// Retrieve config from the database.
// const findCollection = async (req, res) => {
const findConfig = async  (req, res) => {
  try{
  //console.log('findCollection/configServer');
    if ( cacheConfig.has(0) && cacheConfig.get(0)!==""){
      if (req.params.testProd==='prod'){
        var configServer=cacheConfig.get(0);
      } else {
        configServer=cacheConfig.get(1);
      }
        //console.log('configServer retrieved from cache(0)');
        return res.send(configServer);
    } else {
          if (req.params.db!==''){
            current_dbName=req.params.db;
          } 
          //db.config.collection.collectionName=req.params.collection;
          //db.config.collection.name=req.params.collection;
          await accessMongo.accessMongo(CONFIG, req.params.db);

          CONFIG.find()
              .then(data => {
                  testData=JSON.stringify(data);
                  const record = JSON.parse(testData);
                  cacheConfig.set(0, record[0]); // prod
                  cacheConfig.set(1, record[1]); // test
                  return res.send(data);
              })
              .catch(err => {
                  return res.status(500).send({ message:err.message || "Some error occurred while retrieving config"});
              });
    }
  }
  catch(err) {
    return res.status(521).send({status:521, message:"FAILURE " + err.message});
  }; 

}

const findConfigBytring = async (req, res) => {
  //console.log('findCollection/configServer');
    try{
      var searchString = req.query.searchString;
      if (searchString!==undefined && searchString!=="" && req.params.searchField!=="Nil"){
          var condition = searchString ? { [req.params.searchField]: { $regex: new RegExp(searchString), $options: "i" } } : {};    
          if (req.params.db!==''){
              current_dbName=req.params.db;
          }
          //db.config.collection.collectionName=req.params.collection;
          //db.config.collection.name=req.params.collection;
          await accessMongo.accessMongo(CONFIG, req.params.db);

          CONFIG.find(condition)
              .then(data => {
                  return res.send(data);
              })
              .catch(err => {
                  return res.status(500).send({ message:err.message || "Some error occurred while retrieving config"});
              });
      } else {
        return res.status(530).send({ message:"At least one search parameter (string and/or field) is invalid ", status:530});
      }
      
    }
    catch(err) {
      return res.status(521).send({status:521, message:"FAILURE " + err.message});
    }; 

}

// Update configServer by the id in the request
const updateConfig = async (req, res) => {
  try{
  //db.config.collection.collectionName=req.params.collection;
  //db.config.collection.name=req.params.collection;
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
          return res.status(220).send({
            message: `Cannot update Config record with id=${id}. Maybe Config record was not found!`, status:220
          });
        } else return res.send({ message: "Config record was updated successfully." ,status:200});
      })
      .catch(err => {
     
              return res.status(520).send({
                message: "Error updating Config record with id=" + id,status:520 });
      });
    }
    catch(err) {
      return res.status(521).send({status:521, message:"FAILURE " + err.message});
    };
};

// Save config
const uploadConfig = async (req, res) => {
try{
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
    catch(err) {
      return res.status(521).send({status:521, message:"FAILURE " + err.message});
    };
}

const getAllConfig  =  async (req, res) => {
  try{

    // cacheConsole.fillCacheConsole('in getAllConfig req.params.collection=',req.params.collection);
    
    await  accessMongo.accessMongo(CONFIG, dbName)
    //var searchString = undefined;
    //var condition = searchString ? { "test_prod": { $regex: new RegExp(searchString), $options: "i" } } : {};
    //const myData = await getConfigAllData('test',"");
    CONFIG.find() 
      .then(data => {
          return res.send(data);
        })
      .catch(err => {
          return res.status(510).send({status:510, message:err.message + "  error occurred while retrieving all records"});
        });
    /*
    try{
        testData=JSON.stringify(data);
        const record = JSON.parse(testData);
        return res.send(record);
    }
    catch (err) {
        return res.status(500).send({ message:err.message || "Some error occurred while retrieving config"});
            };
    */
    }
  catch(err) {
    return res.status(521).send({status:521, message:"FAILURE " + err.message});
  };
}

// Delete a record with the specified id in the request
const delConfigById = async (req, res) => {
  try{
    await accessMongo.accessMongo(CONFIG, req.params.db);
    const id = req.params.id;
    const resp = await CONFIG.findByIdAndRemove(id);
    try {
        if (!resp) {
          return res.status(220).send({status:220, message:"Cannot find record with id=" + id});
        } else {
          return res.send({message:'successful deletion of record id ' + id, status:200});
        }
      }
    catch(err) {
          return res.status(510).send({status:510, message:"Could not delete record with id=" + id});
      
      };
    }
    catch(err) {
        return res.status(521).send({status:521, message:"FAILURE " + err.message});
    };  
};

module.exports = {
  getAllConfig,
  uploadConfig,
  updateConfig,
  getFilesToCache,
  findConfigBytring,
  findConfig,
  resetCacheConfig,
  getConfigServer,
  getConfigData,
  retrieveConfigServer,
  delConfigById,
  getConfigDB
}
