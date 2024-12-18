const express = require('express');
const router = express.Router();
const FieldController = require('../controllers/Fields.controller');

// Routes

/**
 * @swagger
 * /fields/all:
 *   get:
 *     summary: Récupère tous les champs
 *     tags: [Fields]
 *     responses:
 *       200:
 *         description: Liste de tous les champs
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
 *                     example: "Nom du champ"
 *       500:
 *         description: Erreur interne du serveur
 */
router.get('/all', FieldController.getAllFields);

/**
 * @swagger
 * /fields/{id}:
 *   get:
 *     summary: Récupère un champ par ID
 *     tags: [Fields]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du champ
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Champ correspondant à l'ID
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
 *                   example: "Nom du champ"
 *       404:
 *         description: Champ non trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
router.get('/:id', FieldController.getFieldById);

/**
 * @swagger
 * /fields/add:
 *   post:
 *     summary: Ajoute un nouveau champ
 *     tags: [Fields]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Nom du champ"
 *               fieldChar:
 *                 type: string
 *                 example: "Caractère"
 *               fieldLetter:
 *                 type: string
 *                 example: "Lettre"
 *               valueSaved:
 *                 type: boolean
 *                 example: true
 *               numericValue:
 *                 type: number
 *                 format: float
 *                 example: 10.5
 *               textValue:
 *                 type: string
 *                 example: "Texte"
 *               idType:
 *                 type: integer
 *                 example: 1
 *               idUnit:
 *                 type: integer
 *                 example: 2
 *               idUser:
 *                 type: integer
 *                 example: 3
 *     responses:
 *       201:
 *         description: Champ créé avec succès
 *       400:
 *         description: Requête invalide
 *       500:
 *         description: Erreur interne du serveur
 */
router.post('/add', FieldController.createField);

/**
 * @swagger
 * /fields/{id}:
 *   put:
 *     summary: Met à jour un champ
 *     tags: [Fields]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du champ à mettre à jour
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
 *                 example: "Nom du champ"
 *               fieldChar:
 *                 type: string
 *                 example: "Caractère"
 *               fieldLetter:
 *                 type: string
 *                 example: "Lettre"
 *               valueSaved:
 *                 type: boolean
 *                 example: true
 *               numericValue:
 *                 type: number
 *                 format: float
 *                 example: 10.5
 *               textValue:
 *                 type: string
 *                 example: "Texte"
 *               idType:
 *                 type: integer
 *                 example: 1
 *               idUnit:
 *                 type: integer
 *                 example: 2
 *               idUser:
 *                 type: integer
 *                 example: 3
 *     responses:
 *       200:
 *         description: Champ mis à jour avec succès
 *       404:
 *         description: Champ non trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
router.put('/:id', FieldController.updateField);

/**
 * @swagger
 * /fields/{id}:
 *   delete:
 *     summary: Supprime un champ
 *     tags: [Fields]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du champ à supprimer
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Champ supprimé avec succès
 *       404:
 *         description: Champ non trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
router.delete('/:id', FieldController.deleteField);

module.exports = (app) => {
    /**
     * @swagger
     * tags:
     *   - name: Fields
     *     description: Gestion des champs
     */
    app.use('/fields', router);
};
