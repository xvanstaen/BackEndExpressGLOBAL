
/* ================ */
const mongoose = require("mongoose");
mongoose.set('strictQuery', false);
mongoose.Promise = global.Promise;
var dbTutorial = {};
dbTutorial.tutorials = require("../models/tutorial.model")(mongoose);
dbTutorial.tutorials.collection.name='tutorials';
const Tutorial = dbTutorial.tutorials;
/* ================ */
var dbFS = {};
dbFS.FileSyst = require("../models/fileSystem.model")(mongoose);
dbFS.FileSyst.collection.name='filesystems';
const fileSystem = dbFS.FileSyst;
var dbUsr = {};
dbUsr.usrPSW = require("../models/usrPSW.model")(mongoose);
dbUsr.usrPSW.collection.name='usrpsws';
const usrPSW = dbUsr.usrPSW;

const accessMongo = require("./accessMongo.js"); 
const configFn = require("./config.controller.js");
const cacheConsole = require("./cacheConsole.js");


/* ================ */

async function accessDB(dbName,collection,body){
  var record='';
  var error = 0;
  var theCollection="";
  if (dbName!==''){
    current_dbName=dbName;
  } else {
    return res.send({ message: "Data base field is empty",status:520 });
  }
  if (collection === Tutorial.collection.name){
    await accessMongo.accessMongo(Tutorial, current_dbName);
    theCollection=Tutorial;
    if (body!==""){
      record=new Tutorial(body);
    }
    
  } else if (collection === fileSystem.collection.name){
    await accessMongo.accessMongo(fileSystem, current_dbName);
    theCollection=fileSystem;
    if (body!==""){
      record=new fileSystem(body);
    }
    
  } else if (collection === usrPSW.collection.name){
    await accessMongo.accessMongo(usrPSW, current_dbName);
    theCollection=usrPSW;
    if (body!==""){
      record=new usrPSW(body);
    }
  } else {
    const theConfig=configFn.getConfigDB();
    if (collection === theConfig.theDB.collection.name){
      await accessMongo.accessMongo(theConfig.theDB, theConfig.dbName);
      theCollection=theConfig.theDB;
      if (body!==""){
        record=new theConfig.theDB(body);
      }
    }else {
      error = 404;
    }
  }
  return ({col:theCollection,rec:record, error:error})
}

// Create and Save a new record
const save = async (req, res) => {
  var record="";
  if (req.params.db!==''){
    current_dbName=req.params.db;
  } else {
    return res.status(520).send({status:520, message:"Data base field is empty"});
  }
  if (req.params.collection === Tutorial.collection.name){
    await accessMongo.accessMongo(Tutorial, current_dbName);
    record=new Tutorial(req.body);
  } else if (req.params.collection === fileSystem.collection.name){
    await accessMongo.accessMongo(fileSystem, current_dbName);
    record=new fileSystem(req.body);
  } else if (req.params.collection === usrPSW.collection.name){
    record=new usrPSW(req.body);
    await accessMongo.accessMongo(usrPSW, current_dbName);
  } else {
    const theConfig=configFn.getConfigDB();
    if (req.params.collection === theConfig.theDB.collection.name){
      await accessMongo.accessMongo(theConfig.theDB, theConfig.dbName);
      record=new theConfig.theDB(req.body);
    } else {
      return res.send({msg:'collection ' + req.params.collection + ' is invalid', status:404});
    }
  }
  
  try{
    const resp = await record.save()
    try {
        return res.send(resp);
      }
    catch(err) {
        return res.status(510).send({status:510, message:err.message});
    };
  }  catch(err) {
      return res.status(521).send({status:521, message:"FAILURE " + err.message});
  }; 

};


// Update a record 
const update = async (req, res) => {
    //accessMongo.accessMongo(Tutorial, req.query.db);
    const theValue= await accessDB(req.params.db,req.params.collection,"");
    //accessMongo.accessMongo(Tutorial, req.query.db);
    if (theValue.message!==undefined){
      return  res.status(520).send({status:520, message:theValue.message});
    }
    if  (theValue.error!==0){
      return res.status(540).send({status:540, message:'collection ' + req.params.collection + ' is invalid'});
    }
    const id = req.params.id;
    try{
      const resp = await theValue.col.findByIdAndUpdate(id, req.body, { useFindAndModify: false })
      try {
          if (!resp) {
            return res.status(220).send({status220, message:
              "Cannot update record with id=" + id + "Maybe record was not found!"});
          } else {
            return res.send({message:"record id " + id + " was updated successfully", status:200});
          }
        }
      catch(err) {
            return res.status(510).send({status:510, message:err.message + " Error updating record with id=" + req.params.id});
        };
  }
  catch(err) {
      return res.status(521).send({status:521, message:"FAILURE " + err.message});
  };  
};

// Delete a record with the specified id in the request
const deleteById = async (req, res) => {
  const theValue=await accessDB(req.params.db,req.params.collection,"");
  //accessMongo.accessMongo(Tutorial, req.query.db);
  if (theValue.message!==undefined){
    return  res.status(520).send({status:520, message:theValue.message});
  }
  if  (theValue.error!==0){
    return res.status(540).send({status:540, message:'collection ' + req.params.collection + ' is invalid'});
  }
  const id = req.params.id;
   
  try{
    const resp = await theValue.col.findByIdAndRemove(id)
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

// Delete a record based on a condition
const deleteByString = async (req, res) => {
  const theValue=await accessDB(req.params.db,req.params.collection,"");
  //accessMongo.accessMongo(Tutorial, req.query.db);
  if (theValue.message!==undefined){
    return  res.status(520).send({status:520, message:theValue.message});
  }
  if  (theValue.error!==0){
    return res.status(540).send({status:540, message:'collection ' + req.params.collection + ' is invalid'});
  }
  const id = req.params.id;
  var searchString = req.query.searchString;
  var fieldSearch=req.params.fieldSearch;
     
  const query=  { [fieldSearch]: searchString } ;
  try{
    const resp = await theValue.col.deleteOne(query) // deleteOne
    try {
        if (resp.deletedCount===0) {
          return res.status(220).send({status:220, message:'no record matches the search criteria'});
        } else {
          return res.send(resp);// works when EXACT MATCH
        }
      }
    catch(err) {
          return res.status(510).send({status:510, message:"Could not delete record with search string" + req.query.searchString});
      };
  }
  catch(err) {
      return res.status(521).send({status:521, message:"FAILURE " + err.message});
  };
}; 
// Delete all records in a given collection
const deleteAll = async (req, res) => {
  const theValue=await accessDB(req.params.db,req.params.collection,"");
  //accessMongo.accessMongo(Tutorial, req.query.db);
  if (theValue.message!==undefined){
    return  res.status(520).send({status:520, message:theValue.message});
  }
  if  (theValue.error!==0){
    return res.status(540).send({status:540, message:'collection ' + req.params.collection + ' is invalid'});
  }
  try{
    const resp = await theValue.col.deleteMany({})
    try {
      return res.send({ message: `${resp.deletedCount} records were deleted successfully!`, status:200});
      }
    catch(err) {
      return res.status(510).send({status:510, message:"error occurred while removing all records."});
      };
  }
  catch(err) {
      return res.status(521).send({status:521, message:"FAILURE " + err.message});
  };
};

// Find a single record with an id
const findById = async (req, res) => {
  const theValue=  await accessDB(req.params.db,req.params.collection,"");
  //accessMongo.accessMongo(Tutorial, req.query.db);
  if (theValue.message!==undefined){
    return  res.status(520).send({status:520, message:theValue.message});
  }
  if  (theValue.error!==0){
    return res.status(540).send({status:540, message:'collection ' + req.params.collection + ' is invalid'});
  }
  const id = req.params.id;

  try{
    const resp = await theValue.col.findById(id)
    try {
      if (!resp) {
        return  res.status(220).send({status:200, message:"Didn't find record with id " + req.params.id});
      } else {
        return res.send(resp);
      }
    }
    catch(err) {
          return res.status(510).send({status:510, message:err.message +  "  record with id=" + req.params.id });
      };
  }
  catch(err) {
      return res.status(521).send({status:521, message:"FAILURE " + err.message});
  }; 
     
};

// Find all records
const findAll = async (req, res) => {
  const collection=req.params.collection;
  cacheConsole.fillCacheConsole('in findAll req.params.collection=',collection);
  const theValue=await accessDB(req.params.db,collection,"");
  if (theValue.message!==undefined){
    return  res.status(520).send({status:520, message:theValue.message});
  }
  if  (theValue.error!==0){
    return res.status(540).send({status:540, message:'collection ' + req.params.collection + ' is invalid'});
  }
  
  try{
    theValue.col.find() // { published: true }
      .then(data => {
          return res.send(data);
        })
      .catch(err => {
          return res.status(510).send({status:510, message:err.message + "  error occurred while retrieving all records"});
        });
    }
  catch(err) {
    cacheConsole.fillCacheConsole('in findAll status=521', err.message);
      return res.status(521).send({status:521, message:"FAILURE " + err.message});
    };
  
};

// Retrieve all Tutorials from the database.
const findByCriteria = async (req, res) => {
  const theValue=await accessDB(req.params.db,req.params.collection,"");
  if (theValue.message!==undefined){
    return  res.status(520).send({status:520, message:theValue.message});
  }
  if  (theValue.error!==0){
    return res.status(540).send({status:540, message:'collection ' + req.params.collection + ' is invalid'});
  }

  var searchString = req.query.searchString;
  var fieldSearch=req.params.fieldSearch;
 
  var condition = searchString ? { [fieldSearch]: { $regex: new RegExp(searchString), $options: "i" } } : {};
  try{
    const data = await theValue.col.find(condition);
    try{
        return res.send(data);
    }
    catch(err) {
        return res.status(510).send({status:510, message:err.message || "  error occurred while retrieving record by criteria"});
    };
  }
  catch(err) {
      return res.status(521).send({status:521, message:"FAILURE " + err.message});
  };
}

module.exports = {
  save,
  update,
  deleteById,
  deleteByString,
  deleteAll,
  findById,
  findByCriteria,
  findAll,
}

