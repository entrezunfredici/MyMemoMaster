'use strict'

const bcrypt = require('bcryptjs')

// CHOIX: mot de passe lu depuis ADMIN_SEED_PASSWORD, fallback "Admin1234!" en dev
// RAISON: évite un secret en dur dans le code ; configurable sans modifier le seeder
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const email = process.env.ADMIN_SEED_EMAIL || 'admin@mymemomaster.local'
    const rawPassword = process.env.ADMIN_SEED_PASSWORD || 'Admin1234!'
    const password = await bcrypt.hash(rawPassword, 10)
    const now = new Date()
    await queryInterface.bulkInsert(
      'User',
      [
        {
          userId: 1,
          email,
          name: 'Admin',
          roleId: 1,
          password,
          hasValidatedEmail: true,
          createdAt: now,
          updatedAt: now
        }
      ],
      { ignoreDuplicates: true }
    )
  },

  async down(queryInterface) {
    const email = process.env.ADMIN_SEED_EMAIL || 'admin@mymemomaster.local'
    await queryInterface.bulkDelete('User', { email })
  }
}
