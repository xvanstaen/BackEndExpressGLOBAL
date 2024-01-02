/* CRUD functions:
create
findAll
findOne
update
delete
deleteAll
findAllPublished
*/

// Access to MONGO-DB 

const { ServerApiVersion } = require('mongodb');

const dbConfig = require("../config/db.config.js"); // contains the mongodb url


const mongoose = require("mongoose");
mongoose.set('strictQuery', false);
mongoose.Promise = global.Promise;
const db = {};
db.url = dbConfig.url;
db.mongoose = mongoose;

var options = {
    serverApi: ServerApiVersion.v1 ,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName:""
  }
 
var current_dbName = "";
var previous_dbName = "";
 
const nodecache = require('node-cache');
var cache = new nodecache;


/***************  needed for each database *****************/
/* ================ */
db.tutorials = require("../models/tutorial.model")(mongoose);
db.tutorials.collection.name='tutorials';
const Tutorial = db.tutorials;

/* ================ */
db.config = require("../models/config.model")(mongoose);
db.config.collection.name='configServer';
const Config = db.config;
/************************************************************/



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
    const theValue = await Config.find(condition);
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
  
       current_dbName='ConfigDB';
       db.config.collection.collectionName='configServer';
       db.config.collection.name='configServer';
 
       const mongoStatus = await accessMongo();
       try {
             return (mongoStatus)
             }
        catch (err) {
          console.log(err);
          return (err);
        }

  }


async function accessMongo(){
    if (previous_dbName!== current_dbName){
        if (previous_dbName!=='') {
          // seems mongoose does not accept to connect to more than one database
          // db.$namedb keeps the value of the first db opened 
              mongoose.connection.close();
        }
        options.dbName = current_dbName;
        previous_dbName = current_dbName;
        Config.db.name=current_dbName;

        await db.mongoose.connect(db.url, options)
          try {
            console.log("Connected to MONGO DB " + options.dbName + '  on url= ' + db.url);
            return ({status:200});

          }
          catch(err ) {
            console.log("Cannot connect to MONGO DB!" + options.dbName + '  error is ', err);
            return ({status:503, err:err});
            //process.exit();
          }

    } 
}



// Create and Save a new Tutorial
exports.insert = (req, res) => {
  if (req.query.db!==''){
    current_dbName=req.query.db;
  }
  accessMongo();
    if (!req.body.title) {
       res.status(450).send({ message: "Content cannot be empty!" });
       return;
      }
  // Create a Tutorial
  const tutorial = new Tutorial({
    title: req.body.title,
    description: req.body.description,
    published: req.body.published ? req.body.published : false
  });
  // Save Tutorial in the database
 
  tutorial.save(tutorial)
    .then(data => {
       res.status(200).send(data);
       return;
      })
    .catch(err => {
        return res.status(500).send({
            message:
            err.message || "Some error occurred while creating the Tutorial."
          });
       });
};



// Find a single Tutorial with an id
exports.findOne = (req, res) => {
  accessMongo();
    const id = req.params.id;

    Tutorial.findById(id)
      .then(data => {

        if (!data)
        return  res.status(404).send({ message: "Not found Tutorial with id " + id });
        else return res.send(data);
      })
      .catch(err => {
 
            return res
              .status(500)
              .send({ message: "Error retrieving Tutorial with id=" + id });

        });
       
};
// Update a Tutorial by the id in the request
exports.update = (req, res) => {
  accessMongo();

    if (!req.body) {
        return res.status(400).send({
          message: "Data to update can not be empty!"
        });
      }
      const id = req.params.id;
      Tutorial.findByIdAndUpdate(id, req.body, { useFindAndModify: false })
        .then(data => {
  
          if (!data) {
            return res.status(404).send({
              message: `Cannot update Tutorial with id=${id}. Maybe Tutorial was not found!`
            });
          } else return res.send({ message: "Tutorial was updated successfully." });
        })
        .catch(err => {
       
                return res.status(500).send({
                  message: "Error updating Tutorial with id=" + id
                });
           
        });
};
// Delete a Tutorial with the specified id in the request
exports.delete = (req, res) => {
  accessMongo();
    const id = req.params.id;
   
    Tutorial.findByIdAndRemove(id)
      .then(data => {
       
        if (!data) {
          return res.status(404).send({
            message: `Cannot delete Tutorial with id=${id}. Maybe Tutorial was not found!`
          });
        } else {
          return res.send({
            message: "Tutorial was deleted successfully!"
          });
        }
      })
      .catch(err => {
        
            return res.status(500).send({
              message: "Could not delete Tutorial with id=" + id
            });
      
      });
};
// Delete all Tutorials from the database.
exports.deleteAll = (req, res) => {
  accessMongo();

    Tutorial.deleteMany({})
    .then(data => {
     
      return res.send({
        message: `${data.deletedCount} Tutorials were deleted successfully!`
      });
    })
    .catch(err => {
 
          return res.status(500).send({
            message:
              err.message || "Some error occurred while removing all tutorials."
          });
     
    });
};
// Find all published Tutorials
exports.findAllPublished = (req, res) => {
  accessMongo();
 
    Tutorial.find({ published: true })
    .then(data => {
      
      return res.send(data);
    })
    .catch(err => {
     
          return res.status(500).send({
            message:
              err.message || "Some error occurred while retrieving tutorials."
          });
     
    });
};

// Retrieve all Tutorials from the database.
exports.findByTitle = (req, res) => {
  current_dbName='XMVITdb';
  var title = req.query.title;
  loop=0;
  // var isSent=false;
  var condition = title ? { title: { $regex: new RegExp(title), $options: "i" } } : {};
  const connected = accessMongo().then(result => {
    Tutorial.find(condition)
      .then(data => {
        return res.send(data);
      })
      .catch(err => {
            return res.status(500).send({
              message:
                err.message || "Some error occurred while retrieving tutorials."
            });
      });
  });
};

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

        accessMongo().then
        (result => {
              Config.find(condition)
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

