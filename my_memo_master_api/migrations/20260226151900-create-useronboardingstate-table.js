"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("UserOnboardingState", {
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: "User",
          key: "userId",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      tourSeen: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      checklist: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: Sequelize.literal("'{}'::jsonb"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("UserOnboardingState");
  },
};
