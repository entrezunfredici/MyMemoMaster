require('dotenv').config();
module.exports = {
  username: process.env.PG_USER,
  password: process.env.PG_PASS,
  database: process.env.PG_DB,
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  dialect: "postgres",
  logging: false,
  pool: {
    max: parseInt(process.env.PG_POOL_MAX) || 10,
    min: parseInt(process.env.PG_POOL_MIN) || 2,
    acquire: parseInt(process.env.PG_POOL_ACQUIRE) || 30000,
    idle: parseInt(process.env.PG_POOL_IDLE) || 10000,
  },
};
