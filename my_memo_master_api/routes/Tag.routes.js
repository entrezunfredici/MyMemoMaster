const express = require('express')
const tag = require('../controllers/Tag.controller')
const authMiddleware = require('../middlewares/Auth.middleware')
const validate = require('../middlewares/validate.middleware')
const tagValidators = require('../validators/Tag.validators')

const router = express.Router()

/**
 * @swagger
 * /tags:
 *   get:
 *     summary: Récupère tous les tags
 *     tags: [Tags]
 *     responses:
 *       200:
 *         description: Liste de tous les tags triée par nom.
 *       500:
 *         description: Erreur interne du serveur.
 */
router.get('/', authMiddleware, tag.findAll)

/**
 * @swagger
 * /tags:
 *   post:
 *     summary: Crée un nouveau tag
 *     tags: [Tags]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "révision"
 *     responses:
 *       201:
 *         description: Tag créé avec succès.
 *       400:
 *         description: Données invalides.
 *       500:
 *         description: Erreur interne du serveur.
 */
router.post('/', authMiddleware, tagValidators.create, validate, tag.create)

/**
 * @swagger
 * /tags/diagrammes/{id}:
 *   put:
 *     summary: Définit les tags d'une carte mentale (remplace tous les tags existants)
 *     tags: [Tags]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tagIds]
 *             properties:
 *               tagIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 2, 3]
 *     responses:
 *       200:
 *         description: Tags mis à jour avec succès.
 *       404:
 *         description: Carte mentale introuvable.
 *       500:
 *         description: Erreur interne du serveur.
 */
router.put('/diagrammes/:id', authMiddleware, tagValidators.setTags, validate, tag.setForMindMap)

/**
 * @swagger
 * /tags/leitnersystems/{id}:
 *   put:
 *     summary: Définit les tags d'un système Leitner (remplace tous les tags existants)
 *     tags: [Tags]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tagIds]
 *             properties:
 *               tagIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Tags mis à jour avec succès.
 *       404:
 *         description: Système Leitner introuvable.
 *       500:
 *         description: Erreur interne du serveur.
 */
router.put('/leitnersystems/:id', authMiddleware, tagValidators.setTags, validate, tag.setForLeitnerSystem)

/**
 * @swagger
 * /tags/tests/{id}:
 *   put:
 *     summary: Définit les tags d'un exercice (remplace tous les tags existants)
 *     tags: [Tags]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tagIds]
 *             properties:
 *               tagIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Tags mis à jour avec succès.
 *       404:
 *         description: Exercice introuvable.
 *       500:
 *         description: Erreur interne du serveur.
 */
router.put('/tests/:id', authMiddleware, tagValidators.setTags, validate, tag.setForTest)

/**
 * @swagger
 * /tags/{id}:
 *   get:
 *     summary: Récupère un tag par son ID
 *     tags: [Tags]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Tag récupéré avec succès.
 *       404:
 *         description: Tag introuvable.
 *       500:
 *         description: Erreur interne du serveur.
 */
router.get('/:id', authMiddleware, tag.findOne)

/**
 * @swagger
 * /tags/{id}:
 *   put:
 *     summary: Met à jour un tag
 *     tags: [Tags]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tag mis à jour avec succès.
 *       404:
 *         description: Tag introuvable.
 *       500:
 *         description: Erreur interne du serveur.
 */
router.put('/:id', authMiddleware, tagValidators.update, validate, tag.update)

/**
 * @swagger
 * /tags/{id}:
 *   delete:
 *     summary: Supprime un tag
 *     tags: [Tags]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Tag supprimé avec succès.
 *       404:
 *         description: Tag introuvable.
 *       500:
 *         description: Erreur interne du serveur.
 */
router.delete('/:id', authMiddleware, tag.delete)

module.exports = (app) => {
  /**
   * @swagger
   * tags:
   *   - name: Tags
   *     description: Gestion des tags et association aux contenus
   */
  app.use('/tags', router)
}
