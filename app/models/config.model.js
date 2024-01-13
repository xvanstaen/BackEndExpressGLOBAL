

  module.exports = mymongoose => {
    var schema = mymongoose.Schema(
      {
        id:String,
        title:String,
        test_prod:String,
        GoogleProjectId:String,
        consoleBucket:String,
        googleServer:String,
        mongoServer:String,
        fileSystemServer:String,
        IpAddress:String,
        credentialDate:String,
        bucketFileSystem:String,
        objectFileSystem:String,
        timeoutFileSystem:{
          hh:Number,
          mn:Number,
          bufferTO:{
            hh:Number,
            mn:Number
          },
          bufferInput:{
              hh:Number,
              mn:Number
          }
        },
        filesToCache:[{bucket:String,object:String}],
        UserSpecific:[{theId:String,theType:String,log:Boolean}],
        PointOfRef:{
          bucket:String,
          file:String,
          },
      },
      { timestamps: true }
    );
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
    const Config = mymongoose.model("configServer", schema);
    return Config;
  };
 