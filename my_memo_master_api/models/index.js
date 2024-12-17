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
const LeitnerSystem = require("./LeitnerSystem.model")(sequelize);
const LeitnerSystemsUsers = require("./leitnerSystemsUsers.model")(sequelize);

// Associations

// Association Many-to-Many entre User et LeitnerSystem
User.belongsToMany(LeitnerSystem, {
  through: LeitnerSystemsUsers,
  foreignKey: "idUser",
  otherKey: "idSystem",
  as: "sharedLeitnerSystems",
});

LeitnerSystem.belongsToMany(User, {
  through: LeitnerSystemsUsers,
  foreignKey: "idSystem",
  otherKey: "idUser",
  as: "usersWithAccess",
});

module.exports = {
  instance,
  Role,
  Subject,
};
