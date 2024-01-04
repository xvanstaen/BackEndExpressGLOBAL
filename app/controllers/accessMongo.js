

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
 
var previous_dbName = "";

async function accessMongo(idDataBase, current_dbName){
    if (previous_dbName!== current_dbName){
        if (previous_dbName!=='') {
          // seems mongoose does not accept to connect to more than one database
          // db.$namedb keeps the value of the first db opened 
              mongoose.connection.close();
        }
        options.dbName = current_dbName;
        previous_dbName = current_dbName;
        
        db.name=current_dbName;
        idDataBase.db.name=current_dbName;
        //db.config.collection.name='configServer';//idDataBase.collection.name;
        //db.config.collection.collectionName='configServer';//idDataBase.collectionName;

        //await db.mongoose.connect(db.url, options)
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

module.exports = {
  accessMongo,
}
