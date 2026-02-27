"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("MindMap", {
      idMindMap: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      mmName: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      mindMapJson: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "User",
          key: "userId",
        },
      },
      subjectId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Subject",
          key: "subjectId",
        },
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("MindMap");
  },
};
