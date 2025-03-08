const { DataTypes } = require("sequelize");

module.exports = (instance) => {
    const Subject = instance.define('Subject', {
        subjectId: {
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
        tableName: 'Subject',
        updatedAt: 'updatedAt',
        createdAt: 'createdAt',
        timestamps: true,
    });

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

  return Subject;
};
