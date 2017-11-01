const knexConfig = require("./knexfile");
const knex = require("knex")(knexConfig);
const db = require("bookshelf")(knex);

db.plugin("registry");

module.exports = db;
