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
//const credentials ="/Users/xaviervanstaen/X509-cert-6982656651602215038.pem";
const credentials ="/etc/ssl/X509-cert-MongoDB.pem";


var optionsB = {
    sslKey: credentials,
    sslCert: credentials,
    serverApi: ServerApiVersion.v1 ,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName:"XMVITdb"
  }

  var optionsA = {
    serverApi: ServerApiVersion.v1 ,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName:"XMVITdb"
  }
 
var current_dbName = "XMVITdb";
var previous_dbName = '';
 
const dbConfig = require("../config/db.config.js"); // contains the mongodb url
const mongoose = require("mongoose");
mongoose.Promise = global.Promise;
const db = {};
db.mongoose = mongoose;
db.url = dbConfig.url;
db.tutorials = require("../models/tutorial.model")(mongoose);
const Tutorial = db.tutorials;

async function accessMongo(){
if (previous_dbName!== current_dbName){
  if (previous_dbName!=='') {
    mongoose.connection.close();
  }
  optionsB.dbName = current_dbName;
  previous_dbName = current_dbName;
  db.mongoose
    .connect(db.url, optionsA)
    .then(() => {
      console.log("Connected to MONGO DB " + optionsB.dbName + '  on url= ' + db.url);
    })
    .catch(err => {
      console.log("Cannot connect to MONGO DB!" + optionsB.dbName + '  error is ', err);
      process.exit();
});
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
 
  tutorial
    .save(tutorial)
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

// Retrieve all Tutorials from the database.
exports.findByTitle = (req, res) => {
  accessMongo();
    var title = req.query.title;
 // var isSent=false;
    var condition = title ? { title: { $regex: new RegExp(title), $options: "i" } } : {};
    Tutorial.find(condition)
      .then(data => {
        //isSent=true;
        return res.send(data);
      })
      .catch(err => {
        //if (isSent===false){
            return res.status(500).send({
              message:
                err.message || "Some error occurred while retrieving tutorials."
            });
       // }
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