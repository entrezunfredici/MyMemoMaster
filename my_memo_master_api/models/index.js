const { Sequelize } = require("sequelize");
const dbmsConfig = require("../config/dbms.config");
const dbConfig = require("../config/db.config");
const logger = require("../helpers/logger");

// Création de l'instance Sequelize
const instance = new Sequelize(process.env.ENVIRONMENT === "prod" ? dbmsConfig : dbConfig);
// Models
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


// Associations
Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

//reset database
// instance.sync({ force: true }).then(() => {
//   logger.info("reset database success"); 
// });

instance.sync({ alter: true }).then(() => {
  logger.info("Base de données synchronisée (force true)");
  // Ici tu peux démarrer ton serveur ou ta seed
}).catch((err) => {
  logger.error("Erreur lors de la synchronisation de la base :", err);
});

module.exports = {
  instance,
  ...models,
};
