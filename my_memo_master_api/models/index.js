const { Sequelize } = require('sequelize');
const dbConfig = require('../db.config');
const ResponseType = require('./Response.model')


// Création de l'instance Sequelize
const instance = new Sequelize({
  dialect: dbConfig.dialect,
  storage: dbConfig.storage,
});

// Models
const Role = require("./Role.model")(instance);
const Subject = require("./Subject.model")(instance);

// Associations
// ...

module.exports = {
    instance,
    ResponseType,
    Role,
    Subject,
};
