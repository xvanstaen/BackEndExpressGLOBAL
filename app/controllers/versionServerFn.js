function serverVersion(){
    const myVersion="Version 15Jan2024 V1-1 File System";
    return(myVersion)
  }
  
  const getServerVersion = async (req, res) => { 
    const myVersion=serverVersion();
    return res.send({status:200,version:myVersion});
  }

  module.exports={
    getServerVersion,
    serverVersion,
  }