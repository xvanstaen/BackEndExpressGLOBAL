
/* ================ */
const mongoose = require("mongoose");
mongoose.set('strictQuery', false);
mongoose.Promise = global.Promise;
const db = {};
db.tutorials = require("../models/tutorial.model")(mongoose);
db.tutorials.collection.name='tutorials';
const Tutorial = db.tutorials;
/* ================ */

const accessMongo = require("./accessMongo.js"); 

/* ================ */


// Create and Save a new Tutorial
exports.insert = (req, res) => {
  if (req.query.db!==''){
    current_dbName=req.query.db;
  }
  accessMongo.accessMongo(Tutorial, req.query.db);
    if (!req.body.title) {
       res.status(450).send({ message: "Content cannot be empty!" });
       return;
      }
  // Create a Tutorial
  const objectTutorial = new Tutorial({
    title: req.body.title,
    description: req.body.description,
    published: req.body.published ? req.body.published : false
  });
  // Save Tutorial in the database
 
  Tutorial.save(objectTutorial)
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
    accessMongo.accessMongo(Tutorial, req.query.db);
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
    accessMongo.accessMongo(Tutorial, req.query.db);

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
    accessMongo.accessMongo(Tutorial, req.query.db);
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
    accessMongo.accessMongo(Tutorial, req.query.db);

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
    accessMongo.accessMongo(Tutorial, req.query.db);
 
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
  const connected = accessMongo.accessMongo(Tutorial, req.query.db).then(result => {
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



