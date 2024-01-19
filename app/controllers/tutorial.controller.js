
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
const securityCtrl = require("./securityCtrl.js");

var securityLevel="";

/* ================ */

async function accessDB(dbName,collection,body, userId,userPSW){
  var record='';
  var error = 0;
  var theCollection="";

  if (dbName!==''){
    current_dbName=dbName;
  } else {
    return res.send({ msg: "Data base field is empty",status:520 });
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
    return res.status(520).send({status:520, msg:"Data base field is empty"});
  }

  securityLevel= await securityCtrl.getSecurityAccess('xmv-it-consulting',req.params.userId, req.params.userPSW);
  if (securityLevel.status!==200){
    return res.send(securityLevel);
  } 
  
  
  if (req.params.collection === Tutorial.collection.name){
    await accessMongo.accessMongo(Tutorial, current_dbName);
    record=new Tutorial(req.body);
  } else if (req.params.collection === fileSystem.collection.name){
    if (securityLevel.accessLevel!=='High' || securityLevel.accessLevel!=='Very High'){
      return res.send({status:585,msg:"you don't have the permission to use this functionality"});
    }
    await accessMongo.accessMongo(fileSystem, current_dbName);
    record=new fileSystem(req.body);
  } else if (req.params.collection === usrPSW.collection.name){
    if (securityLevel.accessLevel!=='Very High'){
      return res.send({status:585,msg:"you don't have the permission to use this functionality"});
    }
    record=new usrPSW(req.body);
    await accessMongo.accessMongo(usrPSW, current_dbName);
  } else {
    if (securityLevel.accessLevel!=='Very High'){
      return res.send({status:585,msg:"you don't have the permission to use this functionality"});
    }
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
        return res.status(510).send({status:510, msg:err.message});
    };
  }  catch(err) {
      return res.status(521).send({status:521, msg:"FAILURE " + err.message});
  }; 

};


// Update a record 
const update = async (req, res) => {
    securityLevel= await securityCtrl.getSecurityAccess('xmv-it-consulting',req.params.userId, req.params.userPSW);
    if (securityLevel.status!==200){
      return res.send(securityLevel);
    } 
    const theConfig=configFn.getConfigDB();
    if ((req.params.collection === usrPSW.collection.name || req.params.collection === theConfig.theDB.collection.name)
        && securityLevel.accessLevel!=='Very High'){
          return res.send({status:585,msg:"you don't have the permission to use this functionality"});
    }
    if (req.params.collection === fileSystem.collection.name 
      && (securityLevel.accessLevel!=='Very High' && securityLevel.accessLevel!=='High')){
        return res.send({status:585,msg:"you don't have the permission to use this functionality"});
  }

    //accessMongo.accessMongo(Tutorial, req.query.db);
    const theValue= await accessDB(req.params.db,req.params.collection,"");
    //accessMongo.accessMongo(Tutorial, req.query.db);
    if (theValue.msg!==undefined){
      return  res.status(520).send({status:520, msg:theValue.msg});
    }
    if  (theValue.error!==0){
      return res.status(540).send({status:540, msg:'collection ' + req.params.collection + ' is invalid'});
    }
    const id = req.params.id;
    try{
      const resp = await theValue.col.findByIdAndUpdate(id, req.body, { useFindAndModify: false })
      try {
          if (!resp) {
            return res.status(220).send({status220, msg:
              "Cannot update record with id=" + id + "Maybe record was not found!"});
          } else {
            return res.send({msg:"record id " + id + " was updated successfully", status:200});
          }
        }
      catch(err) {
            return res.status(510).send({status:510, msg:err.message + " Error updating record with id=" + req.params.id});
        };
  }
  catch(err) {
      return res.status(521).send({status:521, msg:"FAILURE " + err.message});
  };  
};

// Delete a record with the specified id in the request
const deleteById = async (req, res) => {
  securityLevel= await securityCtrl.getSecurityAccess('xmv-it-consulting',req.params.userId, req.params.userPSW);
  if (securityLevel.status!==200){
    return res.send(securityLevel);
  } 
  const theConfig=configFn.getConfigDB();
  if ((req.params.collection === usrPSW.collection.name || req.params.collection === theConfig.theDB.collection.name)
      && securityLevel.accessLevel!=='Very High'){
        return res.send({status:585,msg:"you don't have the permission to use this functionality"});
  }
  if (req.params.collection === fileSystem.collection.name 
    && (securityLevel.accessLevel!=='Very High' && securityLevel.accessLevel!=='High')){
      return res.send({status:585,msg:"you don't have the permission to use this functionality"});
}
  const theValue=await accessDB(req.params.db,req.params.collection,"");
  //accessMongo.accessMongo(Tutorial, req.query.db);
  if (theValue.msg!==undefined){
    return  res.status(520).send({status:520, msg:theValue.msg});
  }
  if  (theValue.error!==0){
    return res.status(540).send({status:540, msg:'collection ' + req.params.collection + ' is invalid'});
  }
  const id = req.params.id;
   
  try{
    const resp = await theValue.col.findByIdAndRemove(id)
    try {
        if (!resp) {
          return res.status(220).send({status:220, msg:"Cannot find record with id=" + id});
        } else {
          return res.send({msg:'successful deletion of record id ' + id, status:200});
        }
      }
    catch(err) {
          return res.status(510).send({status:510, msg:"Could not delete record with id=" + id});
      
      };
  }
  catch(err) {
      return res.status(521).send({status:521, msg:"FAILURE " + err.message});
  };  
};

// Delete a record based on a condition
const deleteByString = async (req, res) => {
  securityLevel= await securityCtrl.getSecurityAccess('xmv-it-consulting',req.params.userId, req.params.userPSW);
  if (securityLevel.status!==200){
    return res.send(securityLevel);
  } 
  const theConfig=configFn.getConfigDB();
  if ((req.params.collection === usrPSW.collection.name || req.params.collection === theConfig.theDB.collection.name)
      && securityLevel.accessLevel!=='Very High'){
        return res.send({status:585,msg:"you don't have the permission to use this functionality"});
  }
  if (req.params.collection === fileSystem.collection.name 
    && (securityLevel.accessLevel!=='Very High' && securityLevel.accessLevel!=='High')){
      return res.send({status:585,msg:"you don't have the permission to use this functionality"});
}
  const theValue=await accessDB(req.params.db,req.params.collection,"");
  //accessMongo.accessMongo(Tutorial, req.query.db);
  if (theValue.msg!==undefined){
    return  res.status(520).send({status:520, msg:theValue.msg});
  }
  if  (theValue.error!==0){
    return res.status(540).send({status:540, msg:'collection ' + req.params.collection + ' is invalid'});
  }
  const id = req.params.id;
  var searchString = req.query.searchString;
  var fieldSearch=req.params.fieldSearch;
     
  const query=  { [fieldSearch]: searchString } ;
  try{
    const resp = await theValue.col.deleteOne(query) // deleteOne
    try {
        if (resp.deletedCount===0) {
          return res.status(220).send({status:220, msg:'no record matches the search criteria'});
        } else {
          return res.send(resp);// works when EXACT MATCH
        }
      }
    catch(err) {
          return res.status(510).send({status:510, msg:"Could not delete record with search string" + req.query.searchString});
      };
  }
  catch(err) {
      return res.status(521).send({status:521, msg:"FAILURE " + err.message});
  };
}; 
// Delete all records in a given collection
const deleteAll = async (req, res) => {
  securityLevel= await securityCtrl.getSecurityAccess('xmv-it-consulting',req.params.userId, req.params.userPSW);
  if (securityLevel.status!==200){
    return res.send(securityLevel);
  } 
  const theConfig=configFn.getConfigDB();
  if ((req.params.collection === usrPSW.collection.name || req.params.collection === theConfig.theDB.collection.name)
      && securityLevel.accessLevel!=='Very High'){
        return res.send({status:585,msg:"you don't have the permission to use this functionality"});
  }
  if (req.params.collection === fileSystem.collection.name 
      && (securityLevel.accessLevel!=='Very High' && securityLevel.accessLevel!=='High')){
        return res.send({status:585,msg:"you don't have the permission to use this functionality"});
  }
  const theValue=await accessDB(req.params.db,req.params.collection,"");
  //accessMongo.accessMongo(Tutorial, req.query.db);
  if (theValue.msg!==undefined){
    return  res.status(520).send({status:520, msg:theValue.msg});
  }
  if  (theValue.error!==0){
    return res.status(540).send({status:540, msg:'collection ' + req.params.collection + ' is invalid'});
  }
  try{
    const resp = await theValue.col.deleteMany({})
    try {
      return res.send({ msg: `${resp.deletedCount} records were deleted successfully!`, status:200});
      }
    catch(err) {
      return res.status(510).send({status:510, msg:"error occurred while removing all records."});
      };
  }
  catch(err) {
      return res.status(521).send({status:521, msg:"FAILURE " + err.message});
  };
};

// Find a single record with an id
const findById = async (req, res) => {
  const theValue=  await accessDB(req.params.db,req.params.collection,"");
  //accessMongo.accessMongo(Tutorial, req.query.db);
  if (theValue.msg!==undefined){
    return  res.status(520).send({status:520, msg:theValue.msg});
  }
  if  (theValue.error!==0){
    return res.status(540).send({status:540, msg:'collection ' + req.params.collection + ' is invalid'});
  }
 
  if (req.params.collection === usrPSW.collection.name && securityLevel.accessLevel!=='Very High'){
        return res.send({status:585,msg:"you don't have the permission to use this functionality"});
  }

  const id = req.params.id;

  try{
    const resp = await theValue.col.findById(id)
    try {
      if (!resp) {
        return  res.status(220).send({status:200, msg:"Didn't find record with id " + req.params.id});
      } else {
        return res.send(resp);
      }
    }
    catch(err) {
          return res.status(510).send({status:510, msg:err.message +  "  record with id=" + req.params.id });
      };
  }
  catch(err) {
      return res.status(521).send({status:521, msg:"FAILURE " + err.message});
  }; 
     
};

// Find all records
const findAll = async (req, res) => {
  const collection=req.params.collection;
  //cacheConsole.fillCacheConsole('in findAll req.params.collection=',collection);
  const theValue=await accessDB(req.params.db,collection,"");
  if (theValue.msg!==undefined){
    return  res.status(520).send({status:520, msg:theValue.msg});
  }
  if  (theValue.error!==0){
    return res.status(540).send({status:540, msg:'collection ' + req.params.collection + ' is invalid'});
  }
  if (req.params.collection === usrPSW.collection.name && securityLevel.accessLevel!=='Very High'){
    return res.send({status:585,msg:"you don't have the permission to use this functionality"});
  }

  try{
    theValue.col.find() // { published: true }
      .then(data => {
          return res.send(data);
        })
      .catch(err => {
          return res.status(510).send({status:510, msg:err.message + "  error occurred while retrieving all records"});
        });
    }
  catch(err) {
    //cacheConsole.fillCacheConsole('in findAll status=521', err.message);
      return res.status(521).send({status:521, msg:"FAILURE " + err.message});
    };
  
};

// Retrieve all Tutorials from the database.
const findByCriteria = async (req, res) => {
  const theValue=await accessDB(req.params.db,req.params.collection,"");
  if (theValue.msg!==undefined){
    return  res.status(520).send({status:520, msg:theValue.msg});
  }
  if  (theValue.error!==0){
    return res.status(540).send({status:540, msg:'collection ' + req.params.collection + ' is invalid'});
  }
  if (req.params.collection === usrPSW.collection.name && securityLevel.accessLevel!=='Very High'){
    return res.send({status:585,msg:"you don't have the permission to use this functionality"});
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
        return res.status(510).send({status:510, msg:err.message || "  error occurred while retrieving record by criteria"});
    };
  }
  catch(err) {
      return res.status(521).send({status:521, msg:"FAILURE " + err.message});
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

