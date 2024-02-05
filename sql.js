const knex = require("knex")({
  client: "mysql2",
  connection: {
    host: "192.168.0.71",
    port: process.env.SQL_PORT,
    user: "root",
    password: process.env.SQL_PASS,
    database: "ADA",
  },
});

module.exports = { knex };
