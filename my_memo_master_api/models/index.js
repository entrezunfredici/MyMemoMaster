const { Sequelize } = require('sequelize');
const dbConfig = require('../db.config');
const ResponseType = require('./Response.model')

const instance = new Sequelize({
    dialect: dbConfig.dialect,
    storage: dbConfig.storage
});

//définir les moddèles :

// Définir les associations :


module.exports = {
    instance,
    ResponseType
};
