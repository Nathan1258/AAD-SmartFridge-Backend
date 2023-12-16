const mysql = require("mysql2");

const pool = mysql.createPool({
    host: "192.168.0.71",
    port: "32772",
    user: "root",
    password: process.env.DB_PASS,
    database: "ADA",
});

const query = (sql, params) => {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, conn) => {
            if (err) return reject(err);

            conn.query(sql, params, (err, results, fields) => {
                conn.release();
                if (err) return reject(err);
                resolve(results);
            });
        });
    });
};

module.exports = {query};