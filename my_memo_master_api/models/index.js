const { Sequelize } = require('sequelize');
const dbConfig = require('../config/db.config');

const instance = new Sequelize({
    dialect: dbConfig.dialect,
    storage: dbConfig.storage
});

//définir les modèles :
const Unit = require('./unit.model');

// Définir les associations :


module.exports = {
    instance,
    Unit,
};
