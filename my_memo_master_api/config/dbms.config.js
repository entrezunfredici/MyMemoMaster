require('dotenv').config();
module.exports = {
  username: process.env.PG_USER || "postgres",
  password: process.env.PG_PASS || "admin",
  database: process.env.PG_DB || "mymemomasterdb",
  host: process.env.PG_HOST || "localhost",
  port: process.env.PG_PORT || 5432,
  dialect: "postgres",
  logging: false,
};
