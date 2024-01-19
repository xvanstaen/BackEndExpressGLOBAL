function serverVersion(){
    const myVersion="Version 18Jan2024 V1-3";
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