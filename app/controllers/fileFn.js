const processFile = require("../middleware/upload");
const { format } = require("util");
const { Storage } = require("@google-cloud/storage");
const { Console } = require("console");
const { MAX_RETRY_DEFAULT } = require("@google-cloud/storage/build/src/storage");
const {google} = require('googleapis');

const authFn = require("./authFn");



async function saveFileFn(projectId, bucket,object,fileContent){
    const storage = await authFn.getClient(projectId);
    var bucketFileSystem = storage.bucket(bucket);
    bucketFileSystem.projectId=projectId;
    bucketFileSystem.id=bucket;
    bucketFileSystem.name=bucket;
    await bucketFileSystem.file(object).save(fileContent);
    try{
      const storage = await authFn.getClient(projectId);
      var bucketMetaFS = storage.bucket(bucket);
      bucketMetaFS.projectId=projectId;
      bucketMetaFS.id=bucket;
      bucketMetaFS.name=bucket;
      const newMetadata = {
        cacheControl: 'public,max-age=0,no-cache,no-store',
        contentType: 'application/json'
      };
      await bucketMetaFS.file(object).setMetadata(newMetadata);
      try{
          return(200);
        }
        catch (err) {
          return(201);
        }
      }
    catch (err) {
        console.log('saveFile function ==> failure - 997');
        return(700);
      }
  }

  async function getFileFn(projectId, theBucket, fileName){
    try{
      const storage = await authFn.getClient(projectId);
      var bucket = storage.bucket(theBucket);
      bucket.projectId=projectId;
      const [fileData] = await bucket.file(fileName).download();
      return ({status:200,data:JSON.parse(fileData)});
    }
    catch (err)
    {
      return({status:210,data:[]});
    }  
  }

  module.exports = {
        saveFileFn,
        getFileFn
  }