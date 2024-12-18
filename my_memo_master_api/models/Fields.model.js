const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('Field', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        fieldValue: {
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
        idType: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'fieldTypes', // Correspond au nom de la table associée
                key: 'id',
            },
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    }, {
        tableName: 'fields', // Le nom exact de ta table
        timestamps: true, // Active automatiquement createdAt et updatedAt
        updatedAt: 'updatedAt', // Associe la colonne updatedAt
        createdAt: 'createdAt', // Associe la colonne createdAt
    });
};
