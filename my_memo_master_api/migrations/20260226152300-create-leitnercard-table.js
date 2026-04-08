"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("LeitnerCard", {
      idCard: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      fifo: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: true,
      },
      dateTimeFifo: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      idQuestion: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Question",
          key: "idQuestion",
        },
      },
      idBox: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "LeitnerBox",
          key: "idBox",
        },
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("LeitnerCard");
  },
};
