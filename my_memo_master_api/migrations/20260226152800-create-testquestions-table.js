"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("testQuestions", {
      idTest: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: "Test",
          key: "testId",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      idQuestion: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: "Question",
          key: "idQuestion",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("testQuestions");
  },
};
