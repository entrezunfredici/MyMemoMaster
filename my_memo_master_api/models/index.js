const { Sequelize } = require('sequelize');
const dbConfig = require('../config/db.config');

const instance = new Sequelize({
    dialect: dbConfig.dialect,
    storage: dbConfig.storage
});

// Charger le modèle Unit en passant l'instance
const Unit = require('./unit.model')(instance);

// Définir les associations (si nécessaire)

module.exports = {
    instance,
    Unit,
};
