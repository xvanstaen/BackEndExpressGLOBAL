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
const { stringify } = require("querystring");
const { MAX_RETRY_DEFAULT } = require("@google-cloud/storage/build/src/storage");

// Instantiate a storage client with credentials
//const storage = new Storage({ keyFilename: "google-cloud-key.json" });
const storage = new Storage();
var bucket = storage.bucket("xmv_messages");
var bucketFileSystem = storage.bucket("config-xmvit");


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
    //console.log(' ===> upload');
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

    if (req.params.contentType==='json') {
      var theType='application/json';
    }
    const blobStream = blob.createWriteStream({
      metadata: {
        //cacheControl: 'public,max-age=0,no-cache,no-store',
        //contentType: 'application/json'
        cacheControl: req.params.cacheControl,
        contentType: theType
      },
      resumable: false,
    });

    blobStream.on("error", (err) => {
      res.status(505).send({ message: err.message });
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
    res.status(515).send({
      message: `Could not upload the file: ${req.file.originalname}. ${err}`,
    });
  }
};

const updateMeta = async (req, res) => {
 /*
  const newMetadata = {
    cacheControl: 'public,max-age=0,no-cache,no-store',
    contentType: 'application/json'
  };
   */
  bucket = storage.bucket(req.query.bucket);
  bucket.projectId=req.params.projectId;

  try {
    const [metaData] = await bucket.file(req.params.name).setMetadata(req.params.newMetaData);

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
    //console.log('===> before getFileContent()');
    if (req.query.bucket!==''){
      bucket = storage.bucket(req.query.bucket);
      bucket.projectId=req.params.projectId;
    } 
    const [metaData] = await bucket.file(req.params.name).getMetadata();
    //console.log("File found & link is " + metaData.mediaLink);
    res.redirect(metaData.mediaLink);
    
  } catch (err) {
    //console.log("Could not get the file. " + err);
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
      message: "Object is copied as" + req.params.DESTname + ' in bucket ' + req.params.DESTbucket
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
      message: "Object moved to bucket " + req.params.DESTbucket
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

const updateFileSystem = async (req, res) => {
  try {
    //console.log('===> before updateFileSystem()');
    const newMetadata = {
      cacheControl: 'public,max-age=0,no-cache,no-store',
      contentType: 'application/json'
    };
    bucketFileSystem = storage.bucket(req.query.bucket);
    bucketFileSystem.projectId=req.params.projectId;
    bucketFileSystem.id=req.query.bucket;
    bucketFileSystem.name=req.query.bucket;
    // enableUniformBucketLevelAccess(req.query.bucket);

    let tabLock=JSON.parse(req.params.tabLock);

    let inData=JSON.parse(req.params.inData);


    // await bucketFileSystem.file(req.params.name).setMetadata(newMetadata);
    
    const [fileData] = await bucketFileSystem.file(req.params.name).download();
    try{
      if ( bucketFileSystem.id !== req.query.bucket){
        console.log('wrong Bucket has been accessed' + bucketFileSystem.id + '   tabLock[0].action=' + tabLock[0].action);
        return res.send({message: 'wrong Bucket has been accessed' + '  tabLock[0].action=' + tabLock[0].action, err: 888})
      }
      var theStatus = [];
      var onDestroy=false;
      let theFileParse=JSON.parse(fileData);
      //console.log('theFileParse=',theFileParse);
      if (inData.action==='onDestroy'  ){
        
        onDestroy=true;
        var nbCheckStatus=0;
        if (theFileParse.length>0){

       
          for (var iWait=0; iWait<tabLock.length; iWait++){
            
              if (tabLock[iWait].lock===1){
                console.log('onDestroy - bucket=' + tabLock[iWait].bucket + '  object=' + tabLock[iWait].object);
                inData.action='unlock';
                inData.bucket=tabLock[iWait].bucket;
                inData.object=tabLock[iWait].object;
                inData.user=tabLock[iWait].user;
                inData.createdAt=tabLock[iWait].createdAt;
                inData.updatedAt=tabLock[iWait].updatedAt;
                inData.iWait=iWait;
                inData.IpAddress=tabLock[iWait].IpAddress;
                
                theStatus =checkData(theFileParse, inData, tabLock);
               
                if (typeof theStatus === 'object'){
                  console.log('===>onDestroy -> theStatus = object ' + inData.object +  ' in bucket ' + inData.bucket + ' has been removed');
                  nbCheckStatus++
                  theFileParse = theStatus;
                } else {
                  console.log('===>onDestroy -> theStatus = ' + theStatus) ;
                }
              }
            }
          }
          if (nbCheckStatus===0){
            console.log('onDestroy process; no record was deleted - object ' + inData.object +  ' in bucket ' + inData.bucket);
            return res.send({message: 'onDestroy process; no record was deleted', err: 840})
          }
          theStatus=theFileParse;
          //console.log('after onDestroy -> theFileParse = ' + JSON.stringify(theFileParse));
          //console.log('after onDestroy -> theStatus = ' + JSON.stringify(theStatus));
      } else {
          theStatus=checkData( theFileParse, inData, tabLock);
      }
      if (inData.action==="check" || inData.action==="check&update" && typeof theStatus !== 'object'){
          return res.send(theStatus);
      } else if (typeof theStatus === 'object' || onDestroy === true ){
            //console.log(' status after checkData  is an object' );
            //console.log('===> after processing fileSystem - content of the file is ' + JSON.stringify(theStatus));
            if (onDestroy === false){
                for (var i=0; i<theStatus.length && (theStatus[i].object!==inData.object || theStatus[i].bucket!==inData.bucket); i++){}
                if (inData.action==="lock" && i<theStatus.length){
                  tabLock[inData.iWait].createdAt = theStatus[i].createdAt;
                  tabLock[inData.iWait].updatedAt = theStatus[i].updatedAt;
                  tabLock[inData.iWait].lock = 1;
                  console.log('record ' + tabLock[inData.iWait].object + ' locked - createdAT' +  tabLock[inData.iWait].createdAt + '  updatedAt' + tabLock[inData.iWait].updatedAt);
      
                } else if (inData.action==="unlock" && i===theStatus.length){
                  tabLock[inData.iWait].lock = 0;
                  console.log('record ' + tabLock[inData.iWait].object + ' unlocked  - tabLock[inData.iWait].lock=0' );
                } else if ((inData.action==="updatedAt" || inData.action==="check&update") && i<theStatus.length){
                  tabLock[inData.iWait].updatedAt = theStatus[i].updatedAt;
                  tabLock[inData.iWait].createdAt = theStatus[i].createdAt;
                  console.log('record ' + tabLock[inData.iWait].object + ' updated - createdAT' +  tabLock[inData.iWait].createdAt + '  updatedAt' + tabLock[inData.iWait].updatedAt);
                }  
            }
            //console.log('update Metadata');
            //await bucketFileSystem.file(req.params.name).setMetadata(newMetadata);
            
            //try{
              //console.log('after save is a success');
              if (Array.isArray(theStatus)===false){
                console.log('fileSystem record is not an array - file is saved as empty');
                theStatus=[];
              }
              await bucketFileSystem.file(req.params.name).save(JSON.stringify(theStatus));
              try{
                  return res.send(tabLock);
              }
              catch (err) {
                //console.log('after save is a failure ' + err);
                return res.status(708).send({error: err, fileSystem: theStatus});
              }
            //} 
            //catch (err) {
              //console.log('after save is a failure ' + err);
            //  return res.status(708).send({error: err, fileSystem: theStatus});
            //}

        }  else {
          if (theStatus===300){
            console.log( tabLock[inData.iWait].object + ' already locked detected after checkData ' + theStatus);
            return res.status(300).send({
              message: "already locked detected after checkData ", error:theStatus
            });
          } else {
            console.log(tabLock[inData.iWait].object +' error on Lock after checkData ' + theStatus);
            return res.status(909).send({
              message: "error on Lock after checkData ", error: theStatus
            });
          }
        }
    }  
    
    catch (err) {
         
          console.log(tabLock[inData.iWait].object + '===> after updateFileSystemt() - ERROR 808 -->  '+err);
          //console.log('Should process empty file'); 
          res.status(808).send({ message: "could not process updateFileSystem ", error: err });
          
    }
    
  } catch (err) {
    let inData=JSON.parse(req.params.inData);
    let tabLock=JSON.parse(req.params.tabLock);
    if (inData.action==="lock"  || inData.action==="check&update"){
      var theFileParse=[];
      const theStatus=checkData(theFileParse, inData);
      if (typeof theStatus === 'object'){
            //console.log('file not found & record created');
            
            tabLock[inData.iWait].createdAt = theFileParse[theFileParse.length-1].createdAt;
            tabLock[inData.iWait].updatedAt = theFileParse[theFileParse.length-1].updatedAt;
            tabLock[inData.iWait].lock = 1;
            console.log('record ' + tabLock[inData.iWait].object + ' locked - createdAT' +  tabLock[inData.iWait].createdAt + '  updatedAt' + tabLock[inData.iWait].updatedAt);

            await bucketFileSystem.file(req.params.name).save(JSON.stringify(theStatus));
            try{
              //console.log('on Lock - after save is a success');
              res.send(tabLock);
            } 
            catch (err) {
              console.log('on Lock ' + tabLock[inData.iWait].object + ' - after save is a failure ' + err);
              return res.status(708).send({
                message: "on Lock - after save is a failure " + err
              });
            }
      }
      else {
        if (theStatus===300){
          console.log(' already locked detected after checkData ' + theStatus);
          return res.status(300).send({
            message: "already locked detected after checkData " , error: theStatus
          });
        } else {
          console.log(tabLock[inData.iWait].object + ' error on Lock after checkData ' + theStatus);
          return res.status(909).send({
            message: "error on Lock after checkData " , error: theStatus
          });
        }
        
      }

  } else if (inData.action==="unlock"){
    return res.status(809).send({
      message: "on Unlock Err809 - file not found "
    });
           
  } else if (inData.action==="check" || inData.action==="updatedAt" ){
    console.log('check file ' + tabLock[inData.iWait].object +  ' does not exist; return inData.status 800');
    inData.createdAt='';
    inData.modifiedAt='';
    inData.status=800;
    return res.send(inData);
  } else {
    return res.status(819).send({
      message: "on Unlock Err819 - file not found & action unkown = " + inData.action
    });
  }
  /*
    console.log("updateFileSystem - Could not get the file. 408 " + err);
    res.status(408).send({
      message: "Could not get the file. " + err,
    });
  }
  */
}
};


function checkData(fileSystem, inData, tabLock){
  //console.log('start checkData');
  if (fileSystem.length > 0 ){
      for (var i=0; i<fileSystem.length && (fileSystem[i].object!==inData.object || fileSystem[i].bucket!==inData.bucket); i++){}
      if (inData.action==="lock"){
          if (i===fileSystem. length ){
              // record is not locked so create a new record and flag lock to true
              createRecord(fileSystem,inData);

              console.log('create record ' + inData.object );
              //const status=saveFile(config, fileSystem, object, bucket);
              return (fileSystem);
          } else { // record already exists and already locked
              console.log('record ' + inData.object + 'already exists and already locked - Error 300');
              // check wheter it has been locked form more than 1 hour
              // if yes then lock it for this user
              return(validateLock(fileSystem,inData,i));
          }
      } else if (inData.action==="unlock"){
          if (i===fileSystem.length ){
              // record is not found so cannot be unlocked
              console.log('record not found, so cannot be unlocked - Error 700');
              return(700);
          } else { // record is found; delete it
            if (inData.createdAt === fileSystem[i].createdAt) {
              fileSystem.splice(i,1);
              return (fileSystem);
            } else {
              console.log('record found but createdAt is different ,  so cannot be unlocked - Error 710');
              return(710);
            }
          }
      } else if (inData.action==="updatedAt"){
        if (inData.createdAt === fileSystem[i].createdAt) {
              return(updatedAt(fileSystem,inData,i));
        } else {
          console.log('record found but createdAt is different ,  so cannot be updated - Error 720');
              return(720);
        }
      } else if (inData.action==="check" || inData.action==="check&update"){
        if (i===fileSystem.length ){ // no record found
            if (inData.action==="check"){
              console.log('check file = no record found; return inData.status 800');
              inData.createdAt='';
              inData.modifiedAt='';
              inData.status=800;
            } else {
              createRecord(fileSystem,inData);
              return (fileSystem);
            }
            
        } else {
          if (tabLock[inData.iWait].createdAt === fileSystem[i].createdAt && tabLock[inData.iWait].updatedAt === fileSystem[i].updatedAt){
            if (inData.action==="check"){  
                inData.status=810; 
                  console.log('check file = record found and locked by same user; return inData.status 810');
              // same user is locking the file
            } else {
              return(updatedAt(fileSystem,inData,i));
            }
          } else { 
              inData.status=820; 
              console.log('check file = record found and locked by another user; return inData.status 820');
          }
        } 
        return(inData);
      } else {
        console.log('wrong inData.action ==> return err-730');
        return(730);} // wrong action
  } else { 
      if (inData.action==="lock"){
          console.log('fileSystem is empty; createRecord');
          createRecord(fileSystem,inData);
          return (fileSystem);
      } else if (inData.action==="check"  || inData.action==="check&update"){
          if (inData.action==="check"){
            console.log('check file = fileSystem is empty; return inData.status 800');
            inData.createdAt='';
            inData.modifiedAt='';
            inData.status=800;
            return(inData);
          } else {
            createRecord(fileSystem,inData);
            return (fileSystem);
          }
      } else {
        console.log('fileSystem is empty;');
        return('err-0'); 
      }
      
  }
}

function createRecord(fileSystem, inData){

  const recordSystem={
    action:string="",// 'lock' or 'unlock'
    bucket:string='', 
    object:string='',
    user:string="",
    IpAddress:string="",
    iWait:number=0,
    status:number=0,
    lock:number=0,
    createdAt:string="",
    updatedAt:string="" }

  fileSystem.push(recordSystem);
  fileSystem[fileSystem.length-1].bucket=inData.bucket;
  fileSystem[fileSystem.length-1].object=inData.object;
  fileSystem[fileSystem.length-1].byUser=inData.user;
  fileSystem[fileSystem.length-1].IpAddress=inData.IpAddress;
  fileSystem[fileSystem.length-1].lock=true;
  const aDate=new Date();
  const theDate=aDate.toUTCString();
  //console.log('theDate=',theDate);
  const myTime=theDate.substring(17,19)+theDate.substring(20,22)+theDate.substring(23,25);
  const myDate=convertDate(aDate,"YYYYMMDD") + myTime;
  //console.log('created & updatedAt=' +myDate);
  fileSystem[fileSystem.length-1].createdAt=myDate;
  fileSystem[fileSystem.length-1].updatedAt=myDate;
}

function validateLock(fileSystem, inData, record){
  var stringHour='';
  var stringMin='';
  var stringDay='';
  var stringMonth='';
  var addDay=0;
  var addHour=0;
  
  var theMin=Number(fileSystem[record].updatedAt.substring(10,12)) + Number(inData.timeoutFileSystem.mn); // add xx minutes
  if (Math.trunc(theMin / 60) > 0){
    addHour =  Math.trunc(theMin / 60);
    theMin= theMin % 60;
  }
  if (theMin<10){
      stringMin ='0'+ theMin.toString();
  } else { 
      stringMin = theMin.toString();
  }
  var theHour=Number(fileSystem[record].updatedAt.substring(8,10)) + Number(inData.timeoutFileSystem.hh) + addHour; // add xx hours;
  if (Math.trunc(theHour / 24) > 0){
    addDay =  Math.trunc(theHour / 24);
    theHour= theHour % 24;
  }
  if (theHour<10){
      stringHour ='0'+ theHour.toString();
  } else { 
      stringHour = theHour.toString();
  }

  const theTime = stringHour + stringMin + fileSystem[record].updatedAt.substring(12);
  const theDay = Number(fileSystem[record].updatedAt.substring(6,8)) + addDay;
  if (theDay < 10){
    stringDay = "0" + theDay;
  } else {
    stringDay = theDay;
  }
  const refDate=fileSystem[record].updatedAt.substring(0,6) + stringDay + theTime;

  const aDate = new Date();
  const theDate = aDate.toUTCString();
  const myTime = theDate.substring(17,19)+theDate.substring(20,22)+theDate.substring(23,25);
  const myDate = convertDate(aDate,"YYYYMMDD") + myTime;
  //console.log('validateLock -> myDate=' + myDate + ' refDate='+refDate);
  if (Number(myDate) > Number(refDate)){
      fileSystem[record].createdAt=myDate;
      fileSystem[record].updatedAt=myDate;
      fileSystem[record].bucket=inData.bucket;
      fileSystem[record].object=inData.object;
      fileSystem[record].byUser=inData.user;
      fileSystem[fileSystem.length-1].IpAddress=inData.IpAddress;
      return(fileSystem);
  } else {
      return(300);
  }
}

function updatedAt(fileSystem,inData,iRecord){
  const aDate=new Date();
  const theDate=aDate.toUTCString();
  const myTime=theDate.substring(17,19)+theDate.substring(20,22)+theDate.substring(23,25);
  const myDate=convertDate(aDate,"YYYYMMDD") + myTime;
  fileSystem[iRecord].updatedAt=myDate;
  return(fileSystem);
}

function convertDate(theDate, theFormat) {
  var formattedDate=theFormat;
  //const myDate=new Date();
  //var myUTCDate=theDate.toUTCString();
  //const tabMonth=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  //console.log('convertDate myDate='+myDate);
  //var YY =myDate.substring(11,15);
  //for (var i=0; i<tabMonth.length & tabMonth[i]!== myDate.substring(4,7); i++){};
  //var MM =i+1;
  //var DD =myDate.substring(8,10);
 
  var YY =theDate.getUTCFullYear();
  var MM =theDate.getUTCMonth() + 1;
  var DD =theDate.getUTCDate();
  //console.log('convertDate date= '+ YY + ' ' + MM + " " + DD);
  
  var iYear=0;
  var iMonth=0;
  var iDay=0;
  var MM_String="";
  var DD_String="";
  
  const sep1Pos0=theFormat.indexOf('/');
  const sep2Pos0=theFormat.indexOf('-');
  const sep1Pos1=theFormat.substring(sep1Pos0+1).indexOf('/');
  const sep2Pos1=theFormat.substring(sep2Pos0+1).indexOf('-');

  if (MM<10){
      MM_String="0" + MM.toString();
  }
  else{
      MM_String=MM.toString();
  }
  if (DD<10){
      DD_String="0" + DD.toString();
  }
  else{
     DD_String=DD.toString();
  }


  iYear=theFormat.indexOf("y")+1;
  if (iYear===0) {iYear=theFormat.indexOf("Y")+1};
  if (iYear===0) {formattedDate= ""} 
  else{
      iMonth=theFormat.indexOf("m")+1;
      if (iMonth===0) {iMonth=theFormat.indexOf("M")+1};
      if (iMonth===0) {formattedDate= ""} 
      else{
          iDay=theFormat.indexOf("d")+1;
          if (iDay===0) {iDay=theFormat.indexOf("D")+1};
          if (iDay===0) {formattedDate= ""} 
          else{
              formattedDate=formattedDate.replace(formattedDate.substring(iYear-1,iYear+3),YY.toString());
              formattedDate=formattedDate.replace(formattedDate.substring(iMonth-1,iMonth+1),MM_String);
              formattedDate=formattedDate.replace(formattedDate.substring(iDay-1,iDay+1),DD_String);
          }
      }
  }    
  return(formattedDate);
}

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
  copyObject,
  updateFileSystem,
  
};