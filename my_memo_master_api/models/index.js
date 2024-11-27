const { Sequelize } = require('sequelize');
const dbConfig = require('../db.config');

const instance = new Sequelize({
    dialect: dbConfig.dialect,
    storage: dbConfig.storage
});

// Models
const roles = require('./Roles.models')(instance);

// Associations
// ...

module.exports = {
    instance,
    roles,
};
