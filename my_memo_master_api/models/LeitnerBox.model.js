const { DataTypes } = require("sequelize");

module.exports = (instance) => {
  const LeitnerBox = instance.define(
    "LeitnerBox",
    {
      idBox: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      level: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      intervall: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      color: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      idSystem: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "LeitnerBox",
      timestamps: false,
    }
  );

  LeitnerBox.associate = (models) => {
    LeitnerBox.belongsTo(models.LeitnerSystem, {
      foreignKey: "idSystem",
      as: "leitnerSystem",
    });

    LeitnerBox.hasMany(models.LeitnerCard, {
      foreignKey: "idBox",
      as: "leitnerCards",
    });
  };

  return LeitnerBox;
};
