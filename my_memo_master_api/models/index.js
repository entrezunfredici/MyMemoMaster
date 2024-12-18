const { Sequelize } = require("sequelize");
const dbConfig = require("../db.config");

// Création de l'instance Sequelize
const instance = new Sequelize({
  dialect: dbConfig.dialect,
  storage: dbConfig.storage,
});

// Models
const Role = require("./Role.model")(instance);
const Subject = require("./Subject.model")(instance);
const LeitnerSystem = require("./LeitnerSystem.model")(instance);
const LeitnerSystemsUsers = require("./leitnerSystemsUsers.model")(instance);
const LeitnerCard = require("./LeitnerCard.model")(instance);
const LeitnerBox = require("./LeitnerBox.model")(instance);

// // Associations
LeitnerSystem.associate({ LeitnerBox, LeitnerCard });
LeitnerCard.associate({ LeitnerBox, LeitnerSystem });
LeitnerBox.associate({ LeitnerSystem, LeitnerCard });
Subject.associate({ LeitnerSystem });

module.exports = {
  instance,
  Role,
  Subject,
  LeitnerSystem,
  LeitnerSystemsUsers,
  LeitnerCard,
  LeitnerBox,
};
