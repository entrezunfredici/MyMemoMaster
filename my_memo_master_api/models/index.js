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
const Test = require("./Test.model")(instance);

// Associations
Subject.hasMany(Test, { foreignKey: 'subjectId' });
Test.belongsTo(Subject, { foreignKey: 'subjectId' });

module.exports = {
  instance,
  Role,
  Subject,
  Test,
};
