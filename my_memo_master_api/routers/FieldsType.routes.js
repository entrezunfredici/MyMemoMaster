const express = require('express');
const router = express.Router();
const fieldTypeController = require('../controllers/FieldsType.controller');

// Définition des routes

/**
 * @swagger
 * /field-types/all:
 *   get:
 *     summary: Récupère tous les types de champs
 *     tags: [FieldTypes]
 *     responses:
 *       200:
 *         description: Liste de tous les types de champs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   name:
 *                     type: string
 *                     example: "Texte"
 *       500:
 *         description: Erreur interne du serveur
 */
router.get('/all', fieldTypeController.getAllFieldTypes);

/**
 * @swagger
 * /field-types/{id}:
 *   get:
 *     summary: Récupère un type de champ par ID
 *     tags: [FieldTypes]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du type de champ
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Type de champ correspondant à l'ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 name:
 *                   type: string
 *                   example: "Texte"
 *       404:
 *         description: Type de champ non trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
router.get('/:id', fieldTypeController.getFieldTypeById);

/**
 * @swagger
 * /field-types/add:
 *   post:
 *     summary: Ajoute un nouveau type de champ
 *     tags: [FieldTypes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Texte"
 *               separation:
 *                 type: boolean
 *                 example: true
 *               allowFloat:
 *                 type: boolean
 *                 example: false
 *               allowCharacters:
 *                 type: boolean
 *                 example: true
 *               allowUnit:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: Type de champ créé avec succès
 *       400:
 *         description: Requête invalide
 *       500:
 *         description: Erreur interne du serveur
 */
router.post('/add', fieldTypeController.createFieldType);

/**
 * @swagger
 * /field-types/{id}:
 *   put:
 *     summary: Met à jour un type de champ
 *     tags: [FieldTypes]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du type de champ à mettre à jour
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Numérique"
 *               separation:
 *                 type: boolean
 *                 example: false
 *               allowFloat:
 *                 type: boolean
 *                 example: true
 *               allowCharacters:
 *                 type: boolean
 *                 example: false
 *               allowUnit:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Type de champ mis à jour avec succès
 *       404:
 *         description: Type de champ non trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
router.put('/:id', fieldTypeController.updateFieldType);

/**
 * @swagger
 * /field-types/{id}:
 *   delete:
 *     summary: Supprime un type de champ
 *     tags: [FieldTypes]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du type de champ à supprimer
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Type de champ supprimé avec succès
 *       404:
 *         description: Type de champ non trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
router.delete('/:id', fieldTypeController.deleteFieldType);

module.exports = (app) => {
    /**
     * @swagger
     * tags:
     *   - name: FieldTypes
     *     description: Gestion des types de champs
     */
    app.use('/field-types', router);
};
