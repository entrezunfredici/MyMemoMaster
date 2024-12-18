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
        references: {
          model: "User",
          key: "userId",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
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

  // Associations
  LeitnerSystem.associate = (models) => {
    LeitnerSystem.belongsTo(models.User, {
      foreignKey: "idUser",
      as: "user",
    });

    LeitnerSystem.hasMany(models.LeitnerBox, {
      foreignKey: "idSystem",
      as: "leitnerBoxes",
    });

    LeitnerSystem.belongsToMany(models.LeitnerCard, {
      through: "cardSystems",
      foreignKey: "idSystem",
      otherKey: "idCard",
      as: "leitnerCards",
    });

    LeitnerSystem.belongsToMany(models.Subject, {
      through: "systemSubject",
      foreignKey: "idSystem",
      otherKey: "idSubject",
      as: "subjects",
    });
  };

  return LeitnerSystem;
};
