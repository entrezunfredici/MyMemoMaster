const express = require("express");
const unitController = require("../controllers/Unit.controller");

const router = express.Router();

/**
 * @swagger
 * /units/all:
 *   get:
 *     summary: Obtenir toutes les unités
 *     tags: [Units]
 *     responses:
 *       200:
 *         description: Liste de toutes les unités récupérée avec succès.
 *       500:
 *         description: Erreur serveur.
 */
router.get("/all", unitController.getAllUnits);
//router.get("/all", subject.findAll);

/**
 * @swagger
 * /units/{id}:
 *   get:
 *     summary: Obtenir une unité par ID
 *     tags: [Units]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'unité
 *     responses:
 *       200:
 *         description: Unité récupérée avec succès.
 *       404:
 *         description: Unité non trouvée.
 */
router.get("/:id", unitController.getUnitById);

/**
 * @swagger
 * /units/add:
 *   post:
 *     summary: Ajouter une nouvelle unité
 *     tags: [Units]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Meter"
 *               denomination:
 *                 type: string
 *                 example: "m"
 *               physicalQuantityName:
 *                 type: string
 *                 example: "Lenght"
 *     responses:
 *       201:
 *         description: Unité ajoutée avec succès.
 */
router.post("/add", unitController.addUnit);

/**
 * @swagger
 * /units/{id}:
 *   put:
 *     summary: Mettre à jour une unité
 *     tags: [Units]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'unité
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               denomination:
 *                 type: string
 *     responses:
 *       200:
 *         description: Unité mise à jour avec succès.
 */
router.put("/:id", unitController.updateUnit);

/**
 * @swagger
 * /units/{id}:
 *   delete:
 *     summary: Supprimer une unité par ID
 *     tags: [Units]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'unité
 *     responses:
 *       200:
 *         description: Unité supprimée avec succès.
 */
router.delete("/:id", unitController.deleteUnit);

module.exports = (app) => {
    /**
     * @swagger
     * tags:
     *   name: Units
     *   description: Gestion des unités
     */
    app.use("/units", router);
};
