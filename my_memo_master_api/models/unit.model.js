const { DataTypes } = require('sequelize');

module.exports = (instance) => {
    return instance.define('Unit', {
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
};
