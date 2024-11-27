const { DataTypes } = require('sequelize');
const { instance } = require('./index');

const Unit = instance.define('Unit', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    denomination: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    physicalQuantityId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
}, {
    tableName: 'units',
    timestamps: false,
});

module.exports = Unit;
