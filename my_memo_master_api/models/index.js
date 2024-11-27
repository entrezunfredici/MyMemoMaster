const { Sequelize } = require("sequelize");
const dbConfig = require("../db.config");

// Création de l'instance Sequelize
const instance = new Sequelize({
  dialect: dbConfig.dialect,
  storage: dbConfig.storage,
});

// Models
const roles = require("./Role.model")(instance);
const Subject = require("./Subject.model");

// Associations
// ...

module.exports = {
  instance,
  roles,
  Subject,
};
