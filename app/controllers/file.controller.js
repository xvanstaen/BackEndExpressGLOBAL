/* CRUD functions:
create
findAll
findOne
update
delete
deleteAll
findAllPublished
*/

const processFile = require("../middleware/upload");
const { format } = require("util");
const { Storage } = require("@google-cloud/storage");
const { Console } = require("console");

// Instantiate a storage client with credentials
//const storage = new Storage({ keyFilename: "google-cloud-key.json" });
const storage = new Storage();
var bucket = storage.bucket("xmv_messages");


async function  enableUniformBucketLevelAccess(bucketName) {
  await storage.bucket(bucketName).setMetadata({
    iamConfiguration: {
      uniformBucketLevelAccess: {
        enabled: true,
      },
    },
  });
}

const upload = async (req, res) => {
  try {
    if (req.query.bucket!==''){
      bucket = storage.bucket(req.query.bucket);
      bucket.projectId=req.params.projectId;
      enableUniformBucketLevelAccess(req.query.bucket);
    } 
    await processFile(req, res);
    if (!req.file) {
      return res.status(400).send({ message: "Please upload a file!" });
    }

    // Create a new blob in the bucket and upload the file data. req.params.name
    const blob = bucket.file(req.file.originalname);

    const blobStream = blob.createWriteStream({
      metadata: {
        cacheControl: req.params.cacheControl,
        contentType: req.params.contentType
      },
      resumable: false,
    });
    blobStream.on("error", (err) => {
      res.status(500).send({ message: err.message });
    });
    blobStream.on("finish", async (data) => {
      // Create URL for directly file access via HTTP.
      /** THIS IS NEEDED ONLY IF OBJECT IS NOT PUBLIC 
       ** NOT NEEDED IN THE WAY SECURITY ACCESS IS SET UP AT OBJECT LEVEL 
      const publicUrl = format(
        `https://storage.googleapis.com/${bucket.name}/${blob.name}`
      );
      try {
        // Make the file public
        await bucket.file(req.file.originalname).makePublic();
        next();
      } 
      catch (err){
          if (err.code == "LIMIT_FILE_SIZE") {
            return res.status(500).send({
              message: "File size cannot be larger than 2MB!",
            });
          }
          return res.status(500).send({
                message:
                `Could not upload the file: ${req.file.originalname}. ${err}`,
                 // `Uploaded the file successfully: ${req.file.originalname}, but public access is denied!`,
                //url: publicUrl,
          });
        }
         */


        res.status(200).send({
          message: "Uploaded the file successfully: " + req.file.originalname
        });

    });
    blobStream.end(req.file.buffer);
  } catch (err) {
    res.status(500).send({
      message: `Could not upload the file: ${req.file.originalname}. ${err}`,
    });
  }
};

const updateMeta = async (req, res) => {
  const newMetadata = {
    cacheControl: 'public,max-age=0,no-cache,no-store',
    contentType: 'application/json'
  };
  bucket = storage.bucket(req.query.bucket);
  bucket.projectId=req.params.projectId;
  try {
    const [metaData] = await bucket.file(req.params.name).setMetadata(newMetadata);
    res.status(200).send({
      message: "MetaData successfully updated "
    });
  } catch (err) {
    res.status(500).send({
      message: "MetaData not updated - returned error is " + err
    });
  }
}

const getListFiles = async (req, res) => {
  try {
    if (req.query.bucket!==''){
        bucket = storage.bucket(req.query.bucket);
        bucket.projectId=req.params.projectId;
      } 
    const [files] = await bucket.getFiles();
    let fileInfos = [];
    files.forEach((file) => {
      fileInfos.push({
        name: file.name,
        url: file.metadata.mediaLink,
      });
    });
    res.status(200).send(fileInfos);
  } catch (err) {
    console.log(err);
    res.status(500).send({
      message: "Unable to read list of files!",
    });
  }
};

const getListMetaDataFiles = async (req, res) => {
  try {
    if (req.query.bucket!==''){
        bucket = storage.bucket(req.query.bucket);
        bucket.projectId=req.params.projectId;
      } 
    const [files] = await bucket.getFiles();
    let fileInfos = [];
    files.forEach((file) => {
      fileInfos.push({
        items: file.metadata,
      });
    });
    res.status(200).send(fileInfos);
  } catch (err) {
    console.log(err);
    res.status(500).send({
      message: "Unable to read list of files!",
    });
  }
};

const getFileContent = async (req, res) => {
  try {
    if (req.query.bucket!==''){
      bucket = storage.bucket(req.query.bucket);
      bucket.projectId=req.params.projectId;
    } 
    const [metaData] = await bucket.file(req.params.name).getMetadata();
    console.log("File found & link is " + metaData.mediaLink);
    res.redirect(metaData.mediaLink);
    
  } catch (err) {
    console.log("Could not get the file. " + err);
    res.status(404).send({
      message: "Could not get the file. " + err,
    });
  }
};

const getObjectMeta = async (req, res) => {
  try {
    if (req.query.bucket!==''){
      bucket = storage.bucket(req.query.bucket);
      bucket.projectId=req.params.projectId;
    } 
    const [metaData] = await bucket.file(req.params.name).getMetadata();
    res.status(200).send(metaData);
    
  } catch (err) {
    res.status(500).send({
      message: "Could not download the file. " + err,
    });
  }
};

const listBuckets = async (req, res) => {
  try {
    storage.projectId=req.params.projectId;
    const [buckets] = await storage.getBuckets();
    let BuckInfos = [];
    buckets.forEach(bucket => {
      BuckInfos.push({
        name: bucket.name
      });
    });
    res.status(200).send(BuckInfos);
  } catch (err) {
    res.status(500).send({
      message: "Could not find the buckets " + err,
    });
  }
};

const copyObject = async (req, res) => {
  try {
    bucket = storage.bucket(req.query.bucket);
    bucket.projectId=req.params.projectId;
    await bucket.file(req.params.SRCname)
    .copy(storage.bucket(req.params.DESTbucket).file(req.params.DESTname));

    res.status(200).send({
      message: "Object is copied "
    });
  } catch (err) {
    res.status(505).send({
      message: "Could not copy the object " + err,
    });
  }
};

const moveObject = async (req, res) => {
  try {
    var DestBucket=req.params.DESTbucket;
    var DestObject=req.params.DESTname;
    var SRCObject=req.params.SRCname;
    bucket = storage.bucket(req.query.bucket);
    bucket.projectId=req.params.projectId;
    await bucket.file(req.params.SRCname)
    .move(storage.bucket(req.params.DESTbucket).file(req.params.DESTname));
    res.status(200).send({
      message: "Object moved to bucket " + req.params.DESTname
    });
  } catch (err) {
    res.status(502).send({
      message: "Could not move the object to bucket " + req.params.DESTbucket + 
      'Parameters: DESTbucket=' + DestBucket + 
      ' SRCobject=' + SRCObject  + ' Destobject=' + DestObject + ' error='+ err,
    });
  }
};

const renameObject = async (req, res) => {
  try {
    bucket = storage.bucket(req.query.bucket);
    bucket.projectId=req.params.projectId;
    await bucket.file(req.params.SRCname)
    .rename(req.params.DESTname);
    res.status(200).send({
      message: "Object is renamed "
    });
  } catch (err) {
    res.status(500).send({
      message: "Could not rename the object " + err,
    });
  }
};



const deleteObject = async (req, res) => {
  try {
    bucket = storage.bucket(req.query.bucket);
    bucket.projectId=req.params.projectId;
    await bucket.file(req.params.name)
    .delete();
    res.status(200).send({
      message: "Object is deleted "
    });
  } catch (err) {
    res.status(500).send({
      message: "Could not delete the object " + err,
    });
  }
};


module.exports = {
  upload,
  getListFiles,
  getFileContent,
  getObjectMeta,
  listBuckets,
  updateMeta,
  deleteObject,
  renameObject,
  getListMetaDataFiles,
  moveObject,
  copyObject
  
};