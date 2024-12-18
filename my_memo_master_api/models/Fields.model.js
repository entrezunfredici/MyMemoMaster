const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Field = sequelize.define('Field', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        fieldChar: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        fieldLetter: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        valueSaved: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        numericValue: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        textValue: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        idType: { // Clé secondaire vers FieldTypes
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'FieldTypes', // Nom de la table associée
                key: 'id',
            },
        },
        idUnit: { // Clé secondaire vers Units
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Units',
                key: 'id',
            },
        },
        idUser: { // Clé secondaire vers Users
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id',
            },
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    }, {
        tableName: 'fields', // Nom exact de la table
        timestamps: true, // Active createdAt et updatedAt automatiquement
        updatedAt: 'updatedAt', // Associe la colonne updatedAt
        createdAt: 'createdAt', // Associe la colonne createdAt
    });

    return Field;
};
