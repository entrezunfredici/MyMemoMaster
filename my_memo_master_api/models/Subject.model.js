const { DataTypes } = require("sequelize");

module.exports = (instance) => {
  return instance.define(
    "Subject",
    {
      subjectId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      mindMapId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      leitnerSystemId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      testId: {
        type: DataTypes.INTEGER,
        allowNull: true,
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
    },
    {
      tableName: "Subject",
      updatedAt: 'updatedAt',
      createdAt: 'createdAt',
      timestamps: false,
    }
  );
};
