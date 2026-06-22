'use strict'

const COLUMNS = [
  { name: 'next_review_at', definition: (Sequelize) => ({ type: Sequelize.DATE, allowNull: true }) },
  { name: 'last_review_at', definition: (Sequelize) => ({ type: Sequelize.DATE, allowNull: true }) },
  { name: 'review_count',   definition: (Sequelize) => ({ type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }) },
  { name: 'correct_count',  definition: (Sequelize) => ({ type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }) },
  { name: 'incorrect_count',definition: (Sequelize) => ({ type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }) },
]

module.exports = {
  async up(queryInterface, Sequelize) {
    const existing = await queryInterface.describeTable('LeitnerCard')
    for (const col of COLUMNS) {
      if (!existing[col.name]) {
        await queryInterface.addColumn('LeitnerCard', col.name, col.definition(Sequelize))
      }
    }
  },

  async down(queryInterface) {
    const existing = await queryInterface.describeTable('LeitnerCard')
    for (const col of COLUMNS) {
      if (existing[col.name]) {
        await queryInterface.removeColumn('LeitnerCard', col.name)
      }
    }
  }
}
