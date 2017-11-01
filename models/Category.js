const db = require("../db");

const Category = db.model("Category", {
  tableName: "categories"
});

module.exports = Category;
