const { Sequelize } = require("sequelize");
const dbConfig = require("../config/db.config");

// Création de l'instance Sequelize
const instance = new Sequelize(dbConfig);

// Models
const Role = require("./Role.model")(instance);
const Subject = require("./Subject.model")(instance);
const LeitnerSystem = require("./LeitnerSystem.model")(instance);
const LeitnerSystemsUsers = require("./LeitnerSystemsUsers.model")(instance);
const LeitnerCard = require("./LeitnerCard.model")(instance);
const LeitnerBox = require("./LeitnerBox.model")(instance);
const Unit = require("./unit.model")(instance);
const User = require("./User.model")(instance);

// // Associations
LeitnerSystem.associate({ LeitnerBox, LeitnerCard, Subject, User });
LeitnerCard.associate({ LeitnerBox, LeitnerSystem });
LeitnerBox.associate({ LeitnerSystem, LeitnerCard });
Subject.associate({ LeitnerSystem });
User.associate({ Role, LeitnerSystem });
module.exports = {
  instance,
  Role,
  Subject,
  LeitnerSystem,
  LeitnerSystemsUsers,
  LeitnerCard,
  LeitnerBox,
  Unit,
  User,
};
