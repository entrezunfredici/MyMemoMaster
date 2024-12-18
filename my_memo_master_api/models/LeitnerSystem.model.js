const { DataTypes } = require("sequelize");

module.exports = (instance) => {
  const LeitnerSystem = instance.define(
    "LeitnerSystem",
    {
      idSystem: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      sujet: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      name: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      idUser: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      idMindMap: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "LeitnerSystem",
      timestamps: false,
    }
  );

  LeitnerSystem.associate = (models) => {
    LeitnerSystem.hasMany(models.LeitnerBox, {
      foreignKey: "idSystem",
      as: "leitnerBoxes",
    });
  };

  return LeitnerSystem;
};
