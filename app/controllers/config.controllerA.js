
const { ServerApiVersion } = require('mongodb');
const dbConfig = require("../config/db.config.js"); // contains the mongodb url


const mongoose = require("mongoose");
mongoose.Promise = global.Promise;
const db = {};
db.url = dbConfig.url;
db.mongoose = mongoose;

var options= {
    serverApi: ServerApiVersion.v1 ,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName:""
  }
 
var current_dbName = "ConfigDB";
var previous_dbName = '';
 
const nodecache = require('node-cache');
var cache = new nodecache;


/* ================ */
db.config = require("../models/config.model")(mongoose);
db.config.collection.name='configServer';
const Config = db.config;



async function accessMongo(){
if (previous_dbName!== current_dbName){
  if (previous_dbName!=='') {
    mymongoose.connection.close();
  }
  
  options.dbName = current_dbName;
  previous_dbName = current_dbName;
  Config.db.name=current_dbName;
  // Config.db.$dbName=current_dbName;

  await db.mongoose
    .connect(db.url, options)
    .then(() => {
      console.log("Connected to MONGO DB " + options.dbName + '  on url= ' + db.url);
      connected=true;
    })
    .catch(err => {
      console.log("Cannot connect to MONGO DB!" + options.dbName + '  error is ', err);
      process.exit();
});

}
}


// Retrieve config from the database.
exports.findConfig = (req, res) => {
 // if (req.params.db!==''){
    current_dbName=req.params.db;
  //}
  try {
    if ( cache.has(0)){
      const configData=cache.get(0);
      console.log('configServer retrieved from cache(0)');
      return res.send(configData);
  } else {
     
    // find by baseUrl

        var searchBy = req.query.baseUrl;
        db.config.collection.collectionName=req.params.collection;
        db.config.collection.name=req.params.collection;

        var condition = searchBy ? { searchBy: { $regex: new RegExp(searchBy), $options: "i" } } : {};
        accessMongo().then
        (result => {
            Config.find(condition)
              .then(data => {
                cache.set(0, data);
                return res.send(data);
              })
              .catch(err => {
                //if (isSent===false){
                    return res.status(500).send({ message:err.message || "Some error occurred while retrieving config"});
              // }
              });
          });
      }   
    } catch (err) {
          console.log('pb to retrieve config');
    }
};


