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
models.UserOnboardingState = require("./OnboardingState.model")(instance);

Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

const getPhysicalTableName = (model) => {
  const tableName = model.getTableName();

  if (typeof tableName === "string") {
    return tableName;
  }

  if (tableName && typeof tableName.tableName === "string") {
    return tableName.tableName;
  }

  return String(tableName);
};

const cleanupSQLiteBackupTables = async () => {
  if (instance.getDialect() !== "sqlite") {
    return;
  }

  const queryInterface = instance.getQueryInterface();
  const existingTables = await queryInterface.showAllTables();
  const normalizedTables = new Set(
    existingTables.map((table) => {
      if (typeof table === "string") {
        return table;
      }

      if (table && typeof table.tableName === "string") {
        return table.tableName;
      }

      return String(table);
    })
  );

  for (const model of Object.values(models)) {
    const backupTableName = `${getPhysicalTableName(model)}_backup`;

    if (normalizedTables.has(backupTableName)) {
      await queryInterface.dropTable(backupTableName);
    }
  }
};

const syncModels = async (options = {}) => {
  await cleanupSQLiteBackupTables();

  const syncOptions = { ...options };
  const shouldAlter =
    instance.getDialect() === "postgres" &&
    options.force !== true &&
    Object.prototype.hasOwnProperty.call(options, "alter") === false;

  if (shouldAlter) {
    syncOptions.alter = true;
  }

  await instance.sync(syncOptions);
};

module.exports = {
  instance,
  syncModels,
  ...models,
};
