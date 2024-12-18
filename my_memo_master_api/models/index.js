const { Sequelize } = require('sequelize');
const dbConfig = require('../db.config');


// Création de l'instance Sequelize
const instance = new Sequelize({
  dialect: dbConfig.dialect,
  storage: dbConfig.storage,
});

// Models
const Role = require("./Role.model")(instance);
const Subject = require("./Subject.model")(instance);
const Response = require("./Response.model")(instance);

// Associations
// ...

module.exports = {
    instance,
    Response,
    Role,
    Subject,
};
