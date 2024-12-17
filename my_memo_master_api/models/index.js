const { Sequelize } = require("sequelize");
const dbConfig = require("../db.config");

// Création de l'instance Sequelize
const instance = new Sequelize(dbConfig);

// Models
const Role = require("./Role.model")(instance);
const Subject = require("./Subject.model")(instance);
const User = require("./User.model")(instance);

// Associations
// ...

module.exports = {
  instance,
  Role,
  Subject,
  User,
};
