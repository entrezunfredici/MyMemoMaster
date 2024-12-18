const { Sequelize, DataTypes } = require('sequelize');
const dbConfig = require('../db.config');

// Création de l'instance Sequelize
const instance = new Sequelize({
    dialect: dbConfig.dialect,
    storage: dbConfig.storage
});



// Définir les modèles
const FieldType = require("./FieldType.model")(instance, DataTypes);
const Field = require("./Field.model")(instance, DataTypes);

// Définir les associations
FieldType.associate({ Field });  // Un FieldType peut avoir plusieurs Fields
Field.associate({ FieldType });  // Un Field appartient à un FieldType

// Exporter l'instance et les modèles
module.exports = {
  instance,
  FieldType,
  Field
};