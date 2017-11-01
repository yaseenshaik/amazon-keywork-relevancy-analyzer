const db = require("../db");
require("./Product");

const Keyword = db.model("Keyword", {
  tableName: "keywords",
  product: function() {
    return this.belongsTo("Product");
  }
});

module.exports = Keyword;
