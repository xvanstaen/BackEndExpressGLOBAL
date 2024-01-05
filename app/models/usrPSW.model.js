
  module.exports = mongoose => {

    var schema = mongoose.Schema(
      {
      fileType:String,
      UserId:String,
      psw: String,
      key: Number,
      method: String,
      cryptoAuth:String,
      bucketUserInfo:String,
      },
      { timestamps: true }
    );
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
    const usrPSW = mongoose.model("usrpsws", schema);
    return usrPSW;
  };
 