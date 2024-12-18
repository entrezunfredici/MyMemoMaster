const { Sequelize } = require("sequelize");
const dbConfig = require("../config/db.config");

// Création de l'instance Sequelize
const instance = new Sequelize(dbConfig);

// Models
const models = {};
models.Role = require("./Role.model")(instance);
models.Subject = require("./Subject.model")(instance);
models.LeitnerSystem = require("./LeitnerSystem.model")(instance);
const LeitnerSystemsUsers = require("./leitnerSystemsUsers.model")(instance);
models.LeitnerCard = require("./LeitnerCard.model")(instance);
models.LeitnerBox = require("./LeitnerBox.model")(instance);
models.Unit = require("./unit.model")(instance);
models.User = require("./User.model")(instance);
models.Response = require("./Response.model")(instance);

// // Associations
Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

module.exports = {
  instance,
  ...models,
};
