module.exports = {
  dialect: "sqlite",
  storage: process.env.DB_STORAGE || "./db.sqlite",
  logging: false,
};
