function serverVersion(){
    const myVersion="Version 16Jan2024 V1-0";
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