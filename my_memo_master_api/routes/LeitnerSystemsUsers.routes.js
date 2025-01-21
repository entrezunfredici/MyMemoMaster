const express = require("express");
const controller = require("../controllers/LeitnerSystemsUsers.controller");

const router = express.Router();

/**
 * @swagger
 * /leitnerSystemsUsers/add:
 *   post:
 *     summary: Créer une relation entre un utilisateur et un système Leitner
 *     tags: [LeitnerSystemsUsers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idUser:
 *                 type: integer
 *                 example: 1
 *               idSystem:
 *                 type: integer
 *                 example: 1
 *               writeRight:
 *                 type: boolean
 *                 example: true
 *               shareRight:
 *                 type: boolean
 *                 example: false
 *               shareWithWriteRightRight:
 *                 type: boolean
 *                 example: false
 *               shareWithAllRights:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Relation créée avec succès.
 *       500:
 *         description: Erreur interne du serveur.
 */
router.post("/add", controller.create);

/**
 * @swagger
 * /leitnerSystemsUsers/all:
 *   get:
 *     summary: Récupérer toutes les relations entre utilisateurs et systèmes Leitner
 *     tags: [LeitnerSystemsUsers]
 *     responses:
 *       200:
 *         description: Liste de toutes les relations récupérées avec succès.
 *       500:
 *         description: Erreur interne du serveur.
 */
router.get("/all", controller.findAll);

/**
 * @swagger
 * /leitnerSystemsUsers/{idUser}/{idSystem}:
 *   get:
 *     summary: Récupérer une relation spécifique
 *     tags: [LeitnerSystemsUsers]
 *     parameters:
 *       - name: idUser
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'utilisateur
 *       - name: idSystem
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du système Leitner
 *     responses:
 *       200:
 *         description: Relation récupérée avec succès.
 *       404:
 *         description: Relation non trouvée.
 *       500:
 *         description: Erreur interne du serveur.
 */
router.get("/:idUser/:idSystem", controller.findOne);

/**
 * @swagger
 * /leitnerSystemsUsers/{idUser}/{idSystem}:
 *   put:
 *     summary: Mettre à jour les droits d'une relation existante
 *     tags: [LeitnerSystemsUsers]
 *     parameters:
 *       - name: idUser
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'utilisateur
 *       - name: idSystem
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du système Leitner
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               writeRight:
 *                 type: boolean
 *                 example: true
 *               shareRight:
 *                 type: boolean
 *                 example: true
 *               shareWithWriteRightRight:
 *                 type: boolean
 *                 example: false
 *               shareWithAllRights:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Droits mis à jour avec succès.
 *       500:
 *         description: Erreur interne du serveur.
 */
router.put("/:idUser/:idSystem", controller.update);

/**
 * @swagger
 * /leitnerSystemsUsers/{idUser}/{idSystem}:
 *   delete:
 *     summary: Supprimer une relation entre un utilisateur et un système Leitner
 *     tags: [LeitnerSystemsUsers]
 *     parameters:
 *       - name: idUser
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'utilisateur
 *       - name: idSystem
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du système Leitner
 *     responses:
 *       200:
 *         description: Relation supprimée avec succès.
 *       500:
 *         description: Erreur interne du serveur.
 */
router.delete("/:idUser/:idSystem", controller.delete);

module.exports = (app) => {
    /**
   * @swagger
   * tags:
   *   name: LeitnerSystemsUsers
   *   description: Gestion des droits utilisateurs sur les systèmes Leitner
   */
  app.use("/leitnersystemsusers", router);
};
