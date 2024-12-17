const { DataTypes } = require("sequelize");

module.exports = (instance) => {
  return instance.define(
    "LeitnerCard",
    {
      idCard: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      fifo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      dateTimeFifo: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      idQuestion: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      idBox: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "LeitnerCard",
      timestamps: false,
    }
  );
};
