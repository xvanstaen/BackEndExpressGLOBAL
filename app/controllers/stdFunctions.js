
function fnAddTime(theDate, addHour, addMin){
    // format of theDate is YYYYMMDDHHMNSS [mms]
    var stringHour='';
    var stringMin='';
    var plusDay=0;
    var plusHour=0;
    var theDateHour=Number(theDate.substring(8,10)) + Number(addHour);
    var theDateMin=Number(theDate.substring(10,12)) + Number(addMin);
    
    if (Math.trunc(theDateMin / 60) > 0){
      plusHour =  Math.trunc(theDateMin / 60);
      theDateMin= theDateMin % 60;
    }
    if (theDateMin<10){
        stringMin ='0'+ theDateMin.toString();
    } else { 
        stringMin = theDateMin.toString();
    }
    theDateHour=theDateHour+plusHour;
    if (Math.trunc(theDateHour / 24) > 0){
      plusDay =  Math.trunc(theDateHour / 24);
      theDateHour= theDateHour % 24;
    }
    if (theDateHour<10){
        stringHour ='0'+ theDateHour.toString();
    } else { 
        stringHour = theDateHour.toString();
    }
    var theDay=Number(theDate.substring(6,8));
    var theMonth=Number(theDate.substring(4,6));
    var theYear=Number(theDate.substring(0,4));
    const tabDays=[31,28,31,30,31,30,31,31,30,31,30,31];
    if (plusDay>0){
        theDay=theDay+plusDay;
        if (theDay>tabDays[theMonth-1]){
            theDay=theDay-tabDays[theMonth-1];
            theMonth++
            if (theMonth>12){
                theMonth=theMonth-12;
                theYear=theYear+1;
            }
        }
    }
    var stringMonth="";
    var stringDay="";
    if (theMonth<10){
        stringMonth="0" + theMonth;
    } else {
        stringMonth=theMonth.toString();;
    }
    if (theDay<10){
        stringDay="0" + theDay;
    } else {
        stringDay=theDay.toString();;
    }
    return(theYear.toString()+stringMonth+stringDay+stringHour+stringMin+theDate.substring(12));
  }
  
  
  function createRecord(fileSystem, inData){
  
    const recordSystem={bucket:"", object:"", byUser:"",
        IpAddress:"", lock:false, createdAt:"", updatedAt:"", userServerId:0, credentialDate:""}
    
    fileSystem.push(recordSystem);
    fileSystem[fileSystem.length-1].bucket=inData.bucket;
    fileSystem[fileSystem.length-1].object=inData.object;
    fileSystem[fileSystem.length-1].byUser=inData.user;
    fileSystem[fileSystem.length-1].IpAddress=inData.IpAddress;
    fileSystem[fileSystem.length-1].userServerId=inData.userServerId;
    fileSystem[fileSystem.length-1].lock=true;
    fileSystem[fileSystem.length-1].credentialDate=inData.credentialDate;
    /*
    const aDate=Date.now();
    const theDate=new Date(aDate).toUTCString();
    
    const myTime=theDate.substring(17,19)+theDate.substring(20,22)+theDate.substring(23,25);
    const myDate=convertDate(theDate,"YYYYMMDD") + myTime;
    */
    const myDate = defineMyDate();
    console.log('created & updatedAt=' + myDate + '  for user ' + inData.userServerId);
    fileSystem[fileSystem.length-1].createdAt=myDate;
    fileSystem[fileSystem.length-1].updatedAt=myDate;
    return(fileSystem);
  }
  
  function validateLock(fileSystem, inData, record){
  
    const refDate = fnAddTime(fileSystem[record].updatedAt, inData.timeoutFileSystem.hh, inData.timeoutFileSystem.mn);
    const myDate = defineMyDate();
    if (Number(myDate) > Number(refDate)){
        fileSystem[record].createdAt=myDate;
        fileSystem[record].updatedAt=myDate;
        fileSystem[record].bucket=inData.bucket;
        fileSystem[record].object=inData.object;
        fileSystem[record].byUser=inData.user;
        fileSystem[record].userServerId=inData.userServerId;
        fileSystem[record].IpAddress=inData.IpAddress;
        fileSystem[record].credentialDate=inData.credentialDate;
        console.log('validateLock record : createdAt & updatedAt  = ' + myDate + ' for user ' + inData.userServerId);
        return(fileSystem);
    } else {
        return(300);
    }
  }
  
  function updatedAt(fileSystem, iwait, iRecord){
    const myDate = defineMyDate();
    fileSystem[iRecord].updatedAt=myDate;
    console.log('updatedAt record = ' + myDate + ' for user ' + fileSystem[iRecord].userServerId);
    return(fileSystem);
  }

  function defineMyDate(){
    const theDate=new Date();
    //const myDate=new Date(theDate).toUTCString();
    const year=theDate.getUTCFullYear();
    const month=theDate.getUTCMonth()+1;
    const day=theDate.getUTCDate();
    const milliseconds= theDate.getUTCMilliseconds();
    const seconds= theDate.getUTCSeconds();
    const minutes= theDate.getUTCMinutes();
    const hour= theDate.getUTCHours();
    if (month<10){
      var theMonth='0'+month;
    } else {
      theMonth=month;
    } 
    if (day<10){
      var theDay='0'+day;
    } else {
      theDay=day;
    } 
    if (hour<10){
      var theHour='0'+hour;
    } else {
      theHour=hour;
    } 
    if (minutes<10){
      var theMinutes='0'+minutes;
    } else {
      theMinutes=minutes;
    } 
    if (seconds<10){
      var theSeconds='0'+seconds;
    } else {
      theSeconds=seconds;
    } 
    if (milliseconds<10){
      var theMilliseconds='00'+milliseconds;
    } else if (milliseconds<100) {
      theMilliseconds='0'+milliseconds;
    } else {
      theMilliseconds=milliseconds;
    }
  
    // const laDate=year.toString()+theMonth+theDay+theHour+theMinutes+theSeconds+theMilliseconds;

    return (year.toString()+theMonth+theDay+theHour+theMinutes+theSeconds+theMilliseconds);
  
  
  }
  


    module.exports = {
        createRecord,
        updatedAt,
        validateLock,
        defineMyDate,
        fnAddTime
      }