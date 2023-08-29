

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


const myVersion="Version 28AUG2023 V0"
app.get("/", (req, res) => {
  res.json({ message: "GoogleCloud & MongoDB - " + myVersion + " - server.js [express node.js]." });
});
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`==> Running ${myVersion} at localhost:${port}`);
});






