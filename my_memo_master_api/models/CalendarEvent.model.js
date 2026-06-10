const { DataTypes } = require("sequelize");

module.exports = (instance) => {
  const CalendarEvent = instance.define(
    "CalendarEvent",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      type: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "cours",
        // Valeurs attendues : 'cours' | 'examen' | 'autre'
      },
      classGroupId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "ClassGroup",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "User",
          key: "userId",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      recurrenceMode: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: "manual",
        // Valeurs attendues : 'manual' | 'auto'
      },
      recurrenceRule: {
        type: DataTypes.JSON,
        allowNull: true,
        // Non nul si recurrenceMode = 'auto'
        // Format : { frequency, days, startDate, endDate, startTime, endTime }
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "CalendarEvent",
      timestamps: false,
      indexes: [
        { fields: ["classGroupId"] },
        { fields: ["createdBy"] },
      ],
    }
  );

  CalendarEvent.associate = (models) => {
    CalendarEvent.belongsTo(models.ClassGroup, {
      foreignKey: "classGroupId",
      as: "classGroup",
    });

    CalendarEvent.belongsTo(models.User, {
      foreignKey: "createdBy",
      as: "creator",
    });

    CalendarEvent.hasMany(models.EventOccurrence, {
      foreignKey: "eventId",
      as: "occurrences",
    });
  };

  return CalendarEvent;
};
