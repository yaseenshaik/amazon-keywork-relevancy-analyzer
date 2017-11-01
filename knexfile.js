// Update with your config settings.
require("dotenv").load();

module.exports = {
  client: "mysql",
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    database: process.env.DB_NAME,
    charset: "utf8mb4"
  },
  migrations: {
    tableName: "knex_migrations"
  }
};
