const { DataTypes } = require("sequelize");

module.exports = (instance) => {
  const Subject = instance.define(
    "Subject",
    {
      idSubject: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
    },
    {
      tableName: "Subject",
      updatedAt: "updatedAt",
      createdAt: "createdAt",
      timestamps: false,
    }
  );

  Subject.associate = (models) => {
    Subject.belongsToMany(models.LeitnerSystem, {
      through: "systemSubject",
      foreignKey: "idSubject",
      otherKey: "idSystem",
      as: "leitnerSystems",
    });

    Subject.hasMany(models.Test, {
      foreignKey: "subjectId",
      as: "tests",
    });
  };
};
