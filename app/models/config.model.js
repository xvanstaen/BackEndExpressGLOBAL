

  module.exports = mymongoose => {
    var schema = mymongoose.Schema(
      {
        GoogleProjectId:string= '',
        baseUrl:string= ''
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
 