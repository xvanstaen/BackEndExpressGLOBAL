/* CRUD functions:
create
findAll
findOne
update
delete
deleteAll
findAllPublished
*/

const { ServerApiVersion } = require('mongodb');


  var myoptionsA = {
    serverApi: ServerApiVersion.v1 ,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName:""
  }
 
var current_dbName = "ConfigDB";
var previous_dbName = '';
 
const dbConfig = require("../config/db.config.js"); // contains the mongodb url
const mymongoose = require("mongoose");
mymongoose.Promise = global.Promise;
const mydb = {};
mydb.mongoose = mymongoose;
mydb.url = dbConfig.url;
mydb.config = require("../models/config.model")(mymongoose);
const Config = mydb.config;
var connected=false;


async function accessMongo(){
if (previous_dbName!== current_dbName){
  if (previous_dbName!=='') {
    connected=false;
    mymongoose.connection.close();
  }
  
  myoptionsA.dbName = current_dbName;
  previous_dbName = current_dbName;
  Config.db.name=current_dbName;
  // Config.db.$dbName=current_dbName;

  const cnx = await mydb.mongoose
    .connect(mydb.url, myoptionsA)
    .then(() => {
      console.log("Connected to MONGO DB " + myoptionsA.dbName + '  on url= ' + mydb.url);
      connected=true;
    })
    .catch(err => {
      console.log("Cannot connect to MONGO DB!" + myoptionsA.dbName + '  error is ', err);
      process.exit();
});

}
}


// Retrieve config from the database.
exports.findCollection = (req, res) => {
  if (req.params.db!==''){
    current_dbName=req.params.db;
  }
  try {
     accessMongo();
    // find by baseUrl

        var searchBy = req.query.baseUrl;
        mydb.config.collection.collectionName=req.params.collection;
        mydb.config.collection.name=req.params.collection;

        var condition = searchBy ? { searchBy: { $regex: new RegExp(searchBy), $options: "i" } } : {};
        Config.find(condition)
          .then(data => {
            //isSent=true;
            //mymongoose.connection.close();
            const db2={};
            return res.send(data);
          })
          .catch(err => {
            //if (isSent===false){
                return res.status(500).send({
                  message:
                    err.message || "Some error occurred while retrieving config"
                });
          // }
          });
    } catch (err) {
    
  }
};

