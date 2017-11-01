const db = require("../db");
require("./Category");

const Product = db.model("Product", {
  tableName: "products",
  category: function() {
    return this.belongsTo("Category");
  }
});

module.exports = Product;
