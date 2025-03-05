require('dotenv').config();
module.exports = {
  username: process.env.PG_USER,
  password: process.env.PG_PASS,
  database: process.env.PG_DB,
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  dialect: "postgres",
  logging: false,
};
