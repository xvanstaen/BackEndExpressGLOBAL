

const cors = require("cors");
const express = require("express");
const app = express();
app.use(cors());
app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
var bodyParser = require('body-parser');
// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
// parse requests of content-type - application/json
//app.use(bodyParser.json());

//Google Cloud: avec Express.js, utilisez le paramètre trust proxy 
app.set('trust proxy', true);

const initRoutes = require("./app/routes");
initRoutes(app);

const mongoConfig = require("./app/controllers/config.controller.js");

mongoConfig.getConfigServer()
.then( async (res) => {
  console.log('in server.js - mongo DB is open ' + JSON.stringify(res));
  if (res.status===200){
    searchString=undefined;  
    const configData = mongoConfig.getConfigData('prod',searchString)
      .then( async (res) => {
        if (res.status===200){
          console.log('in server.js - config data is returned; status code = 200' );
        } else {
          console.log('in server.js - config data is not returned; status code = ' + res.status) ;
        }
        displayStatus(res.status);
      })
      .catch ((err) => {
        console.log(' ### config data is not returned, err='+err);
        displayStatus(501);
      })
  } else {
    console.log(' *** problem to open MongoDB, err='+ res.status);
    displayStatus(502);
  }
})
.catch( (err) => {
  console.log(' ==> problem to open MongoDB, err='+ err);
    displayStatus(503);
})



function displayStatus(code){
  const myVersion="Version 04Jan2024 V0-1";
  var configData = "";
  if (code===200){
    configData=" configData retrieved in MongoDB";
  } else {
    configData=" ISSUE - configData NOT retrieved in MongoDB; error code="+code;
  }
  app.get("/", (req, res) => {
    res.json({ message: "GoogleCloud & MongoDB - " + myVersion + " - server.js [express node.js]." + configData});
  });
  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    console.log(`==> Running ${myVersion} at localhost:${port}`);
  });
}




