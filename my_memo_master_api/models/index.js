const { Sequelize } = require("sequelize");
const dbmsConfig = require("../config/dbms.config");
const dbConfig = require("../config/db.config");

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

// Associations
Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

//reset database
// instance.sync({ force: true }).then(() => {
//   console.log("reset database success"); 
// });

instance.sync({ alter: true }).then(() => {
  console.log("Update database success"); 
});

module.exports = {
  instance,
  ...models,
};
