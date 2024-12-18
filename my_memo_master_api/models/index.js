const { Sequelize } = require("sequelize");
const dbConfig = require("../config/db.config");

// Création de l'instance Sequelize
const instance = new Sequelize({
  dialect: dbConfig.dialect,
  storage: dbConfig.storage,
});

// Models
const Role = require("./Role.model")(instance);
const Subject = require("./Subject.model")(instance);
const Unit = require("./unit.model");

// Définir les associations :

// Associations
// ...

module.exports = {
  instance,
  Role,
  Subject,
  Unit,
};
