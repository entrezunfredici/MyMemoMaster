const { DataTypes } = require("sequelize");

module.exports = (instance) => {
  return instance.define(
    "Question",
    {
      idQuestion: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      questionPosition: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      statement: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      }
    },
    {
      tableName: "Question",
      timestamps: false,
    },
  );
};
