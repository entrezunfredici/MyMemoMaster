const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FieldType = sequelize.define('FieldType', {
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
        separation: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        allowFloat: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
        },
        allowCharacters: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
        },
        allowUnit: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
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
        tableName: 'fieldTypes', // Nom exact de la table dans la base de données
        timestamps: true, // Active createdAt et updatedAt
        updatedAt: 'updatedAt', // Colonne associée à updatedAt
        createdAt: 'createdAt', // Colonne associée à createdAt
    });

    // Associations avec d'autres modèles
    FieldType.associate = (models) => {
        FieldType.hasMany(models.Field, {
            foreignKey: 'idType', // Relation entre Field et FieldType
            as: 'fields', // Alias pour la relation
        });
    };

    return FieldType;
};
