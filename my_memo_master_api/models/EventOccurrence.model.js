const { DataTypes } = require("sequelize");

module.exports = (instance) => {
  const EventOccurrence = instance.define(
    "EventOccurrence",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      eventId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "CalendarEvent",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      startTime: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      endTime: {
        type: DataTypes.TIME,
        allowNull: false,
      },
    },
    {
      tableName: "EventOccurrence",
      timestamps: false,
      indexes: [
        { fields: ["eventId"] },
        { fields: ["date"] },
      ],
    }
  );

  EventOccurrence.associate = (models) => {
    EventOccurrence.belongsTo(models.CalendarEvent, {
      foreignKey: "eventId",
      as: "calendarEvent",
    });

    EventOccurrence.hasMany(models.Deadline, {
      foreignKey: "occurrenceId",
      as: "deadlines",
    });
  };

  return EventOccurrence;
};
