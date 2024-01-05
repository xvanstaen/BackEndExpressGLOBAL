

  module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
      fileType:String,
      bucket: String,
      object: String,
      byUser: String,
      IpAddress: String,
      lock: String,
      createdAt: String,
      updatedAt: String,
      userServerId:Number,
      credentialDate: String,
      timeoutFileSystem:{
      hh:String, mn:String}
      },
      { timestamps: true }
    );
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
    const fileSys = mongoose.model("filesystems", schema);
    return fileSys;
  };
 