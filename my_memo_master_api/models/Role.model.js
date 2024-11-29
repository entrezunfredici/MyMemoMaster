const { DataTypes } = require('sequelize');

module.exports = (instance) => {
    return instance.define('Role', {
        roleId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(50),
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
        tableName: 'Role',
        updatedAt: 'updatedAt',
        createdAt: 'createdAt',
        timestamps: true,
    })
}