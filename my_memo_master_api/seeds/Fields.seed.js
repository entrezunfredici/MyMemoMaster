const { Sequelize } = require('sequelize');
const dbConfig = require('../db.config');

// Importation des modèles
const FieldTypeModel = require('../models/FieldType.model');
const FieldModel = require('../models/Fields.model');

// Connexion à la base SQLite
const sequelize = new Sequelize({
  dialect: dbConfig.dialect,
  storage: dbConfig.storage,
});

// Initialisation des modèles
const FieldType = FieldTypeModel(sequelize);
const Field = FieldModel(sequelize);

// Définition des associations (Many-to-One)
Field.belongsTo(FieldType, { foreignKey: 'idType' });
FieldType.hasMany(Field, { foreignKey: 'idType' });

// Fonction pour remplir la base de données
const seedDatabase = async () => {
  try {
    // Synchroniser les tables
    await sequelize.sync({ force: true });
    console.log('Base de données synchronisée !');

    // Données pour la table FieldType
    const fieldTypes = await FieldType.bulkCreate([
      { name: 'Text', separation: 'true', allowFloat: false, allowCharacters: true, allowUnit: false },
      { name: 'Number', separation: 'false', allowFloat: true, allowCharacters: false, allowUnit: true },
      { name: 'Date', separation: 'false', allowFloat: false, allowCharacters: false, allowUnit: false },
    ]);

    console.log('Données FieldType insérées avec succès !');

    // Données pour la table Field
    await Field.bulkCreate([
      { fieldValue: 'Hello', fieldChar: 'H', fieldLetter: 'e', valueSaved: true, idType: fieldTypes[0].id },
      { fieldValue: '12345', fieldChar: '1', fieldLetter: '2', valueSaved: false, idType: fieldTypes[1].id },
      { fieldValue: '2024-01-01', fieldChar: '-', fieldLetter: '2', valueSaved: true, idType: fieldTypes[2].id },
    ]);

    console.log('Données Field insérées avec succès !');
  } catch (error) {
    console.error('Erreur lors du seed de la base de données :', error);
  } finally {
    await sequelize.close();
    console.log('Connexion fermée.');
  }
};

// Lancer le seed
seedDatabase();
