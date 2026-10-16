'use strict'

const bcrypt = require('bcryptjs')

// =============================================================================
//  Comptes de test pour les parcours E2E (QA.03 / QA.05).
//
//  VERROU : ne fait rien tant que SEED_E2E_USERS n'est pas exactement 'true'.
//  Les seeders sont rejoués au démarrage de CHAQUE pod API (entrypoint), y
//  compris en production — sans ce garde-fou, deux comptes à mot de passe
//  connu apparaîtraient sur l'environnement de production.
//
//  Second garde-fou : refus explicite si NODE_ENV vaut 'production', même si
//  la variable est positionnée par erreur.
//
//  Les comptes sont créés avec hasValidatedEmail: true — la connexion est
//  refusée sans validation d'email (User.controller.js), et un parcours E2E
//  ne peut pas relever une boîte mail.
// =============================================================================

const ROLE_ETUDIANT = 2
const ROLE_ENSEIGNANT = 3

/**
 * Comptes créés, avec leur rôle.
 *
 * AUCUN mot de passe par défaut : un identifiant écrit dans le code finit
 * dans l'historique git et dans toute image construite depuis ce dépôt, et
 * la valeur « de test » devient la valeur réelle le jour où quelqu'un oublie
 * de renseigner la variable. Le seeder échoue donc franchement plutôt que de
 * créer un compte au mot de passe connu. Les valeurs vivent dans `.env`
 * (local) et `.env.ci` (CI). Signalé par javascript:S2068.
 */
const accounts = () => {
  const missing = ['E2E_STUDENT_PASSWORD', 'E2E_TEACHER_PASSWORD'].filter(
    (key) => !process.env[key]
  )
  if (missing.length > 0) {
    throw new Error(
      `SEED_E2E_USERS=true mais ${missing.join(' et ')} non renseigné(s). ` +
        'Définir ces variables ou désactiver le seeder E2E.'
    )
  }

  return [
    {
      email: process.env.E2E_STUDENT_EMAIL || 'e2e-student@mymemomaster.local',
      rawPassword: process.env.E2E_STUDENT_PASSWORD,
      name: 'E2E Étudiant',
      roleId: ROLE_ETUDIANT
    },
    {
      email: process.env.E2E_TEACHER_EMAIL || 'e2e-teacher@mymemomaster.local',
      rawPassword: process.env.E2E_TEACHER_PASSWORD,
      name: 'E2E Enseignant',
      roleId: ROLE_ENSEIGNANT
    }
  ]
}

const isEnabled = () =>
  process.env.SEED_E2E_USERS === 'true' && process.env.NODE_ENV !== 'production'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    if (!isEnabled()) return

    const now = new Date()
    for (const account of accounts()) {
      const existing = await queryInterface.rawSelect(
        'User',
        { where: { email: account.email } },
        ['userId']
      )
      if (existing) continue

      await queryInterface.bulkInsert('User', [
        {
          email: account.email,
          name: account.name,
          roleId: account.roleId,
          password: await bcrypt.hash(account.rawPassword, 10),
          hasValidatedEmail: true,
          createdAt: now,
          updatedAt: now
        }
      ])
    }
  },

  async down(queryInterface) {
    if (!isEnabled()) return
    for (const account of accounts()) {
      await queryInterface.bulkDelete('User', { email: account.email })
    }
  }
}
