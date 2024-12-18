const { Sequelize } = require('sequelize');
const dbConfig = require('../db.config');

// Création de l'instance Sequelize
const instance = new Sequelize({
    dialect: dbConfig.dialect,
    storage: dbConfig.storage,
});

// Définir les modèles
const FieldType = require("./FieldType.model")(instance);
const Field = require("./Field.model")(instance);

// Définir les associations
FieldType.associate = function(models) {
  // Un FieldType peut avoir plusieurs Fields
  FieldType.hasMany(models.Field, {
    foreignKey: 'fieldTypeId',
    as: 'fields',
  });
};

Field.associate = function(models) {
  // Un Field appartient à un FieldType
  Field.belongsTo(models.FieldType, {
    foreignKey: 'fieldTypeId',
    as: 'fieldType',
  });
};

// Exporter l'instance et les modèles
module.exports = {
  instance,
  FieldType,
  Field
};
