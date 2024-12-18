const express = require("express");
const subject = require("../controllers/Subject.controller.js");

const router = express.Router();

/**
 * @swagger
 * /subjects/all:
 *   get:
 *     summary: Récupère tous les sujets
 *     tags: [Subjects]
 *     responses:
 *       200:
 *         description: Liste de tous les sujets récupérée avec succès.
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
 *                     example: "Math"
 *       500:
 *         description: Erreur interne du serveur.
 */
router.get("/all", subject.findAll);

/**
 * @swagger
 * /subjects/{id}:
 *   get:
 *     summary: Récupère un sujet par son ID
 *     tags: [Subjects]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du sujet à récupérer
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sujet récupéré avec succès.
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
 *                   example: "Math"
 *       404:
 *         description: Sujet non trouvé.
 *       500:
 *         description: Erreur interne du serveur.
 */
router.get("/:id", subject.findOne);

/**
 * @swagger
 * /subjects/add:
 *   post:
 *     summary: Ajoute un nouveau sujet
 *     tags: [Subjects]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Math"
 *     responses:
 *       201:
 *         description: Sujet créé avec succès.
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
 *                   example: "Math"
 *       500:
 *         description: Erreur interne du serveur.
 */
router.post("/add", subject.create);

/**
 * @swagger
 * /subjects/{id}:
 *   put:
 *     summary: Met à jour un sujet existant
 *     tags: [Subjects]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du sujet à mettre à jour
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
 *                 example: "Updated Subject Name"
 *     responses:
 *       200:
 *         description: Sujet mis à jour avec succès.
 *       404:
 *         description: Sujet non trouvé.
 *       500:
 *         description: Erreur interne du serveur.
 */
router.put("/:id", subject.update);

/**
 * @swagger
 * /subjects/{id}:
 *   delete:
 *     summary: Supprime un sujet par son ID
 *     tags: [Subjects]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du sujet à supprimer
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sujet supprimé avec succès.
 *       404:
 *         description: Sujet non trouvé.
 *       500:
 *         description: Erreur interne du serveur.
 */
router.delete("/:id", subject.delete);

module.exports = router;
