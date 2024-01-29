// const mysql = require("mysql2");
//
// const pool = mysql.createPool({
//   host: "192.168.0.71",
//   port: process.env.SQL_PORT,
//   user: "root",
//   password: process.env.SQL_PASS,
//   database: "ADA",
// });
//
// const query = (sql, params) => {
//   return new Promise((resolve, reject) => {
//     pool.getConnection((err, conn) => {
//       if (err) return reject(err);
//
//       conn.query(sql, params, (err, results) => {
//         conn.release();
//         if (err) return reject(err);
//         resolve(results);
//       });
//     });
//   });
// };
//
// module.exports = { query };

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
