'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date()
    await queryInterface.bulkInsert(
      'Role',
      [
        { roleId: 1, name: 'Admin plateforme', createdAt: now, updatedAt: now },
        { roleId: 2, name: 'Étudiant', createdAt: now, updatedAt: now },
        { roleId: 3, name: 'Enseignant', createdAt: now, updatedAt: now },
        { roleId: 4, name: 'Admin établissement', createdAt: now, updatedAt: now },
        { roleId: 5, name: 'Modérateur', createdAt: now, updatedAt: now }
      ],
      { ignoreDuplicates: true }
    )
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('Role', { roleId: [1, 2] })
  }
}
