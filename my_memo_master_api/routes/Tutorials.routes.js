const express = require('express');
const tutorials = require('../controllers/Tutorials.controller.js');

const router = express.Router();

/**
 * @swagger
 * /tutorials/all:
 *   get:
 *     summary: Obtenir tous les tutoriels
 *     tags: [Tutorials]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Numéro de la page pour la pagination
 *       - in: query
 *         name: perPage
 *         schema:
 *           type: integer
 *         description: Nombre d'éléments par page pour la pagination
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Terme de recherche pour filtrer les tutoriels
 *       - in: query
 *         name: subjectId
 *         schema:
 *           type: integer
 *         description: ID du sujet pour filtrer les tutoriels
 *       - in: query
 *         name: revisionTips
 *         schema:
 *           type: boolean
 *         description: Booléen pour filtrer les tutoriels avec des conseils de révision
 *     responses:
 *       200:
 *         description: Liste de tous les tutoriels récupérée avec succès.
 *       500:
 *         description: Erreur serveur.
 */
router.get('/all', tutorials.findAll);

/**
 * @swagger
 * /tutorials/{id}:
 *   get:
 *     summary: Obtenir un tutoriel par ID
 *     tags: [Tutorials]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du tutoriel
 *     responses:
 *       200:
 *         description: Tutoriel récupéré avec succès.
 *       404:
 *         description: Tutoriel non trouvé.
 *       500:
 *         description: Erreur serveur.
 */
router.get('/:id', tutorials.findOne);

/**
 * @swagger
 * /tutorials/add:
 *   post:
 *     summary: Ajouter un nouveau tutoriel
 *     tags: [Tutorials]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               link:
 *                 type: string
 *               revision_tips:
 *                 type: boolean
 *               idSubject:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Tutoriel créé avec succès.
 *       500:
 *         description: Erreur serveur.
 */
router.post('/add', tutorials.create);

/**
 * @swagger
 * /tutorials/{id}:
 *   put:
 *     summary: Mettre à jour un tutoriel par ID
 *     tags: [Tutorials]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du tutoriel
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               link:
 *                 type: string
 *               revision_tips:
 *                 type: boolean
 *               idSubject:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Tutoriel mis à jour avec succès.
 *       404:
 *         description: Tutoriel non trouvé.
 *       500:
 *         description: Erreur serveur.
 */
router.put('/:id', tutorials.update);

/**
 * @swagger
 * /tutorials/{id}:
 *   delete:
 *     summary: Supprimer un tutoriel par ID
 *     tags: [Tutorials]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du tutoriel
 *     responses:
 *       200:
 *         description: Tutoriel supprimé avec succès.
 *       404:
 *         description: Tutoriel non trouvé.
 *       500:
 *         description: Erreur serveur.
 */
router.delete('/:id', tutorials.delete);

module.exports = (app) => {
    /**
     * @swagger
     * tags:
     *   name: Tutorials
     *   description: Gestion des tutoriels
     */
    app.use('/tutorials', router);
  
  };