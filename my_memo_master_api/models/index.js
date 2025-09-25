const { Sequelize } = require("sequelize");
const dbmsConfig = require("../config/dbms.config");
const dbConfig = require("../config/db.config");

// Instantiate Sequelize using the right configuration for the current environment
const instance = new Sequelize(process.env.ENVIRONMENT === "prod" ? dbmsConfig : dbConfig);

// Register models
const models = {};
models.Role = require("./Role.model")(instance);
models.Subject = require("./Subject.model")(instance);
models.LeitnerSystem = require("./LeitnerSystem.model")(instance);
models.LeitnerSystemsUsers = require("./leitnerSystemsUsers.model")(instance);
models.LeitnerCard = require("./LeitnerCard.model")(instance);
models.LeitnerBox = require("./LeitnerBox.model")(instance);
models.Unit = require("./Unit.model")(instance);
models.User = require("./User.model")(instance);
models.Response = require("./Response.model")(instance);
models.Fields = require("./Fields.model")(instance);
models.FieldsType = require("./FieldsType.model")(instance);
models.Diagramme = require("./diagramme.model")(instance);
models.Test = require("./Test.model")(instance);
models.Question = require("./Question.model")(instance);
models.Tutorials = require("./Tutorials.model")(instance);

Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

const syncModels = async (options = {}) => {
  const syncOptions = { alter: true, ...options };
  await instance.sync(syncOptions);
};

module.exports = {
  instance,
  syncModels,
  ...models,
};
